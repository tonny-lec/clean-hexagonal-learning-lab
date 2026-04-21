import { describe, expect, it } from 'vitest';
import type { OutboxPort } from '../src/application/ports/outbox-port.js';
import type { OrderRepositoryPort } from '../src/application/ports/order-repository-port.js';
import type { TransactionContext, UnitOfWorkPort } from '../src/application/ports/unit-of-work-port.js';
import { placeOrder } from '../src/application/use-cases/place-order.js';
import { OrderAuthorizationPolicy } from '../src/application/policies/order-authorization-policy.js';
import { Money } from '../src/domain/money.js';
import type { OrderPlacedEvent } from '../src/domain/order.js';

describe('placeOrder transaction boundaries', () => {
  it('passes the same transaction handle to repository and outbox writes', async () => {
    const transactionsSeen: TransactionContext[] = [];
    const savedEvents: OrderPlacedEvent[][] = [];
    const savedOrderIds: string[] = [];

    const orderRepository: OrderRepositoryPort = {
      async save(order, _options, transaction) {
        savedOrderIds.push(order.id);
        transactionsSeen.push(transaction);
      },
      async findById() {
        return undefined;
      },
      async findByIdempotencyKey() {
        return undefined;
      },
    };

    const outbox: OutboxPort = {
      async save(events, transaction) {
        savedEvents.push(events);
        transactionsSeen.push(transaction);
      },
      async listPending() {
        return [];
      },
      async listDeadLetters() {
        return [];
      },
      async markAsPublished() {
        return;
      },
      async markAsFailed() {
        return;
      },
    };

    const unitOfWork: UnitOfWorkPort = {
      async runInTransaction<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T> {
        const transactionHandle = { kind: 'transaction-handle' };
        return work(transactionHandle);
      },
    };

    await placeOrder(
      {
        actor: {
          actorId: 'admin-1',
          role: 'admin',
        },
        customerId: 'customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
      },
      {
        catalog: {
          async getUnitPrice() {
            return Money.fromMinor(1200, 'JPY');
          },
        },
        orderRepository,
        paymentGateway: {
          async charge(customerId, amount) {
            return { customerId, amount: amount.toJSON(), confirmationId: 'payment-1' };
          },
          async refund(paymentConfirmationId, amount) {
            return { paymentConfirmationId, amount: amount.toJSON(), refundConfirmationId: 'refund-1' };
          },
        },
        outbox,
        unitOfWork,
        authorizationPolicy: new OrderAuthorizationPolicy({ highValueThreshold: Money.fromMinor(5000, 'JPY') }),
        idGenerator: () => 'order-transaction',
      },
    );

    expect(savedOrderIds).toEqual(['order-transaction']);
    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0][0]).toMatchObject({ type: 'order.placed', orderId: 'order-transaction' });
    expect(transactionsSeen).toHaveLength(2);
    expect(transactionsSeen[0]).toBe(transactionsSeen[1]);
  });
});
