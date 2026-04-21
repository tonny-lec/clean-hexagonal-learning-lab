import { describe, expect, it } from 'vitest';
import { FailingPaymentGateway } from '../src/adapters/payment/failing-payment-gateway.js';
import { FakePaymentGateway } from '../src/adapters/payment/fake-payment-gateway.js';
import { StripeLikePaymentGateway } from '../src/adapters/payment/stripe-like-payment-gateway.js';
import { Money } from '../src/domain/money.js';

describe('payment adapters', () => {
  it('returns a deterministic receipt from the fake gateway', async () => {
    const gateway = new FakePaymentGateway();

    await expect(gateway.charge('customer-1', Money.fromMinor(1200, 'JPY'), 'request-1')).resolves.toEqual({
      customerId: 'customer-1',
      amount: { amountInMinor: 1200, currency: 'JPY' },
      confirmationId: 'fake-request-1',
    });
    await expect(gateway.refund('fake-request-1', Money.fromMinor(1200, 'JPY'), 'refund-1')).resolves.toEqual({
      paymentConfirmationId: 'fake-request-1',
      amount: { amountInMinor: 1200, currency: 'JPY' },
      refundConfirmationId: 'fake-refund-1',
    });
  });

  it('throws from the failing gateway', async () => {
    const gateway = new FailingPaymentGateway('simulated failure');

    await expect(gateway.charge('customer-1', Money.fromMinor(1200, 'JPY'), 'request-1')).rejects.toThrow(
      'simulated failure',
    );
    await expect(gateway.refund('payment-1', Money.fromMinor(1200, 'JPY'), 'refund-1')).rejects.toThrow(
      'simulated failure',
    );
  });

  it('uses provider-like confirmation ids in the stripe-like gateway', async () => {
    const gateway = new StripeLikePaymentGateway();

    const receipt = await gateway.charge('customer-1', Money.fromMinor(1200, 'JPY'), 'request-1');
    const refund = await gateway.refund(receipt.confirmationId, Money.fromMinor(1200, 'JPY'), 'refund-1');

    expect(receipt.confirmationId).toMatch(/^pi_/);
    expect(receipt.amount).toEqual({ amountInMinor: 1200, currency: 'JPY' });
    expect(refund.refundConfirmationId).toMatch(/^re_/);
    expect(refund.paymentConfirmationId).toBe(receipt.confirmationId);
  });
});
