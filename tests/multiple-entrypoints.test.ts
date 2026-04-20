import { describe, expect, it } from 'vitest';
import { runPlaceOrderBatch } from '../src/adapters/batch/place-order-batch.js';
import { presentOrderSummaryForCli, presentPlaceOrderResultForCli } from '../src/adapters/presenters/order-presenter.js';

describe('multiple entrypoints helpers', () => {
  it('runs the same use case from a batch adapter', async () => {
    const calls: string[] = [];

    const result = await runPlaceOrderBatch(
      [
        { customerId: 'customer-1', items: [{ sku: 'BOOK', quantity: 1 }] },
        { customerId: 'customer-2', items: [{ sku: 'PEN', quantity: 2 }] },
      ],
      async (command) => {
        calls.push(command.customerId);
        return {
          orderId: `order-for-${command.customerId}`,
          totalAmount: { amountInMinor: 1000, currency: 'JPY' },
          paymentConfirmationId: `payment-for-${command.customerId}`,
        };
      },
    );

    expect(calls).toEqual(['customer-1', 'customer-2']);
    expect(result).toHaveLength(2);
  });

  it('formats use case DTOs for CLI output', () => {
    expect(
      presentPlaceOrderResultForCli({
        orderId: 'order-1',
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
        paymentConfirmationId: 'payment-1',
      }),
    ).toContain('order-1');

    expect(
      presentOrderSummaryForCli({
        orderId: 'order-1',
        customerId: 'customer-1',
        lines: [{ sku: 'BOOK', quantity: 2, unitPrice: { amountInMinor: 1200, currency: 'JPY' } }],
        totalAmount: { amountInMinor: 2400, currency: 'JPY' },
      }),
    ).toContain('customer-1');
  });
});
