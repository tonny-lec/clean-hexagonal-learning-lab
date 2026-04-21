import { describe, expect, it } from 'vitest';
import { InMemoryAuditLog } from '../src/adapters/in-memory/in-memory-audit-log.js';
import { InMemoryObservability } from '../src/adapters/in-memory/in-memory-observability.js';
import { InMemoryOrderRepository } from '../src/adapters/in-memory/in-memory-order-repository.js';
import { InMemoryOutbox } from '../src/adapters/in-memory/in-memory-outbox.js';
import { NoopUnitOfWork } from '../src/adapters/in-memory/noop-unit-of-work.js';
import type { FulfillmentPort, FulfillmentReceipt } from '../src/application/ports/fulfillment-port.js';
import type { PaymentGatewayPort, PaymentReceipt, RefundReceipt } from '../src/application/ports/payment-gateway-port.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { runOrderCheckoutSaga } from '../src/application/use-cases/run-order-checkout-saga.js';
import type { Order } from '../src/domain/order.js';
import { Money } from '../src/domain/money.js';

const catalog = {
  async getUnitPrice(sku: string) {
    if (sku === 'BOOK') return Money.fromMinor(1200, 'JPY');
    if (sku === 'PEN') return Money.fromMinor(250, 'JPY');
    throw new Error(`Unknown SKU: ${sku}`);
  },
};

class RecordingPaymentGateway implements PaymentGatewayPort {
  readonly charges: Array<{ customerId: string; amountInMinor: number; requestId?: string }> = [];
  readonly refunds: Array<{ paymentConfirmationId: string; amountInMinor: number; requestId?: string }> = [];

  constructor(private readonly options: { refundFailureMessage?: string } = {}) {}

  async charge(customerId: string, amount: Money, requestId?: string): Promise<PaymentReceipt> {
    this.charges.push({ customerId, amountInMinor: amount.amountInMinor, requestId });
    return {
      customerId,
      amount: amount.toJSON(),
      confirmationId: `payment-${this.charges.length}`,
    };
  }

  async refund(paymentConfirmationId: string, amount: Money, requestId?: string): Promise<RefundReceipt> {
    this.refunds.push({ paymentConfirmationId, amountInMinor: amount.amountInMinor, requestId });

    if (this.options.refundFailureMessage) {
      throw new Error(this.options.refundFailureMessage);
    }

    return {
      paymentConfirmationId,
      amount: amount.toJSON(),
      refundConfirmationId: `refund-${this.refunds.length}`,
    };
  }
}

class RecordingFulfillmentService implements FulfillmentPort {
  readonly requests: Array<{ orderId: string; paymentConfirmationId: string; requestId?: string }> = [];

  async request(order: Order, paymentConfirmationId: string, requestId?: string): Promise<FulfillmentReceipt> {
    this.requests.push({ orderId: order.id, paymentConfirmationId, requestId });
    return {
      orderId: order.id,
      paymentConfirmationId,
      fulfillmentConfirmationId: `fulfillment-${this.requests.length}`,
    };
  }
}

class FailingFulfillmentService implements FulfillmentPort {
  constructor(private readonly message: string) {}

  async request(): Promise<FulfillmentReceipt> {
    throw new Error(this.message);
  }
}

describe('runOrderCheckoutSaga', () => {
  it('completes checkout, persists the order, and emits the outbox event when fulfillment succeeds', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();
    const paymentGateway = new RecordingPaymentGateway();
    const fulfillment = new RecordingFulfillmentService();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    const result = await runOrderCheckoutSaga(
      {
        actor: { actorId: 'admin-1', role: 'admin' },
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 2 }],
        idempotencyKey: 'checkout-1',
        telemetry: {
          source: 'http',
          requestId: 'request-1',
          correlationId: 'request-1',
          traceId: 'trace-request-1',
        },
      },
      {
        catalog,
        orderRepository: repository,
        outbox,
        unitOfWork: new NoopUnitOfWork(),
        paymentGateway,
        fulfillmentService: fulfillment,
        authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        observability,
        auditLog,
        idGenerator: () => 'order-saga-1',
      },
    );

    expect(result).toEqual({
      orderId: 'order-saga-1',
      totalAmount: { amountInMinor: 2400, currency: 'JPY' },
      paymentConfirmationId: 'payment-1',
      fulfillmentConfirmationId: 'fulfillment-1',
      workflowStatus: 'completed',
    });
    expect(paymentGateway.charges).toEqual([{ customerId: 'customer-1', amountInMinor: 2400, requestId: 'checkout-1' }]);
    expect(paymentGateway.refunds).toEqual([]);
    expect(fulfillment.requests).toEqual([
      { orderId: 'order-saga-1', paymentConfirmationId: 'payment-1', requestId: 'checkout-1' },
    ]);
    expect((await repository.findById('order-saga-1'))?.totalAmount().toJSON()).toEqual({
      amountInMinor: 2400,
      currency: 'JPY',
    });
    expect(outbox.messages).toHaveLength(1);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'order.checkout.completed',
        context: {
          source: 'http',
          requestId: 'request-1',
          correlationId: 'request-1',
          traceId: 'trace-request-1',
        },
      }),
    );
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'order-checkout-completed',
        aggregateId: 'order-saga-1',
      }),
    );
  });

  it('refunds the payment and returns a compensated result when fulfillment fails after payment succeeds', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();
    const paymentGateway = new RecordingPaymentGateway();
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    const result = await runOrderCheckoutSaga(
      {
        actor: { actorId: 'admin-1', role: 'admin' },
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
        idempotencyKey: 'checkout-compensate',
      },
      {
        catalog,
        orderRepository: repository,
        outbox,
        unitOfWork: new NoopUnitOfWork(),
        paymentGateway,
        fulfillmentService: new FailingFulfillmentService('fulfillment temporarily unavailable'),
        authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        observability,
        auditLog,
        idGenerator: () => 'order-saga-2',
      },
    );

    expect(result).toEqual({
      orderId: 'order-saga-2',
      totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      paymentConfirmationId: 'payment-1',
      workflowStatus: 'compensated',
      compensationConfirmationId: 'refund-1',
      fulfillmentError: 'fulfillment temporarily unavailable',
    });
    expect(paymentGateway.refunds).toEqual([
      { paymentConfirmationId: 'payment-1', amountInMinor: 1200, requestId: 'checkout-compensate-compensation' },
    ]);
    await expect(repository.findById('order-saga-2')).resolves.toBeUndefined();
    expect(outbox.messages).toEqual([]);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'order.checkout.compensated',
        attributes: expect.objectContaining({ orderId: 'order-saga-2' }),
      }),
    );
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'order-checkout-compensated',
        aggregateId: 'order-saga-2',
      }),
    );
  });

  it('returns a compensation-failed result when the refund step also fails', async () => {
    const repository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutbox();
    const paymentGateway = new RecordingPaymentGateway({ refundFailureMessage: 'refund API unavailable' });
    const observability = new InMemoryObservability();
    const auditLog = new InMemoryAuditLog();

    const result = await runOrderCheckoutSaga(
      {
        actor: { actorId: 'admin-1', role: 'admin' },
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
        idempotencyKey: 'checkout-compensation-failed',
      },
      {
        catalog,
        orderRepository: repository,
        outbox,
        unitOfWork: new NoopUnitOfWork(),
        paymentGateway,
        fulfillmentService: new FailingFulfillmentService('fulfillment permanently unavailable'),
        authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        observability,
        auditLog,
        idGenerator: () => 'order-saga-3',
      },
    );

    expect(result).toEqual({
      orderId: 'order-saga-3',
      totalAmount: { amountInMinor: 1200, currency: 'JPY' },
      paymentConfirmationId: 'payment-1',
      workflowStatus: 'compensation-failed',
      fulfillmentError: 'fulfillment permanently unavailable',
      compensationError: 'refund API unavailable',
    });
    await expect(repository.findById('order-saga-3')).resolves.toBeUndefined();
    expect(outbox.messages).toEqual([]);
    expect(observability.records).toContainEqual(
      expect.objectContaining({
        name: 'order.checkout.compensation.failed',
        attributes: expect.objectContaining({ orderId: 'order-saga-3' }),
      }),
    );
    expect(auditLog.entries).toContainEqual(
      expect.objectContaining({
        action: 'order-checkout-compensation-failed',
        aggregateId: 'order-saga-3',
      }),
    );
  });
});
