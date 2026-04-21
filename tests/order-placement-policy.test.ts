import { describe, expect, it } from 'vitest';
import { OrderPlacementPolicy } from '../src/domain/policies/order-placement-policy.js';
import { Money } from '../src/domain/money.js';

describe('OrderPlacementPolicy', () => {
  it('allows standard customers when the order total is within the standard limit', () => {
    const policy = new OrderPlacementPolicy({
      standardLimit: Money.fromMinor(5000, 'JPY'),
      premiumLimit: Money.fromMinor(20000, 'JPY'),
    });

    expect(
      policy.evaluate({
        customerTier: 'standard',
        orderTotal: Money.fromMinor(4500, 'JPY'),
      }),
    ).toEqual({ allowed: true });
  });

  it('rejects standard customers when the order total exceeds the standard limit', () => {
    const policy = new OrderPlacementPolicy({
      standardLimit: Money.fromMinor(5000, 'JPY'),
      premiumLimit: Money.fromMinor(20000, 'JPY'),
    });

    expect(
      policy.evaluate({
        customerTier: 'standard',
        orderTotal: Money.fromMinor(5001, 'JPY'),
      }),
    ).toEqual({
      allowed: false,
      reason: 'Standard customers cannot place orders above 5000 JPY.',
    });
  });

  it('uses the premium limit for premium customers', () => {
    const policy = new OrderPlacementPolicy({
      standardLimit: Money.fromMinor(5000, 'JPY'),
      premiumLimit: Money.fromMinor(20000, 'JPY'),
    });

    expect(
      policy.evaluate({
        customerTier: 'premium',
        orderTotal: Money.fromMinor(15000, 'JPY'),
      }),
    ).toEqual({ allowed: true });
  });
});
