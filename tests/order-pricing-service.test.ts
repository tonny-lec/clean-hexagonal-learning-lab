import { describe, expect, it } from 'vitest';
import { OrderPricingService } from '../src/domain/services/order-pricing-service.js';
import { Money } from '../src/domain/money.js';

describe('OrderPricingService', () => {
  it('calculates subtotal from raw order inputs before the aggregate is created', () => {
    const pricing = new OrderPricingService();

    const subtotal = pricing.calculateSubtotal([
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
      { sku: 'PEN', quantity: 1, unitPrice: Money.fromMinor(250, 'JPY') },
    ]);

    expect(subtotal.toJSON()).toEqual({ amountInMinor: 2650, currency: 'JPY' });
  });

  it('applies a percentage discount and returns the discounted total', () => {
    const pricing = new OrderPricingService();

    const discounted = pricing.applyPercentageDiscount(Money.fromMinor(10000, 'JPY'), 10);

    expect(discounted.toJSON()).toEqual({ amountInMinor: 9000, currency: 'JPY' });
  });

  it('rejects invalid discount percentages', () => {
    const pricing = new OrderPricingService();

    expect(() => pricing.applyPercentageDiscount(Money.fromMinor(1000, 'JPY'), 120)).toThrow(
      'Discount percentage must be between 0 and 100.',
    );
  });
});
