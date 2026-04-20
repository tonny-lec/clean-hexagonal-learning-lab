import { describe, expect, it } from 'vitest';
import { Money } from '../src/domain/money.js';

describe('Money', () => {
  it('adds values with the same currency', () => {
    const subtotal = Money.fromMinor(2400, 'JPY').add(Money.fromMinor(250, 'JPY'));

    expect(subtotal.toJSON()).toEqual({ amountInMinor: 2650, currency: 'JPY' });
  });

  it('rejects negative amounts', () => {
    expect(() => Money.fromMinor(-1, 'JPY')).toThrow('Money amount must not be negative.');
  });

  it('rejects arithmetic across different currencies', () => {
    expect(() => Money.fromMinor(100, 'JPY').add(Money.fromMinor(1, 'USD'))).toThrow(
      'Money currency mismatch.',
    );
  });
});
