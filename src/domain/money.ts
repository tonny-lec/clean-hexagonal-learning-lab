export class Money {
  private constructor(
    public readonly amountInMinor: number,
    public readonly currency: string,
  ) {
    if (!Number.isInteger(amountInMinor)) {
      throw new Error('Money amount must be an integer in minor units.');
    }

    if (amountInMinor < 0) {
      throw new Error('Money amount must not be negative.');
    }

    if (!currency) {
      throw new Error('Money currency is required.');
    }
  }

  static fromMinor(amountInMinor: number, currency: string): Money {
    return new Money(amountInMinor, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountInMinor + other.amountInMinor, this.currency);
  }

  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Money multiplier must be a positive integer.');
    }

    return new Money(this.amountInMinor * quantity, this.currency);
  }

  toJSON(): { amountInMinor: number; currency: string } {
    return {
      amountInMinor: this.amountInMinor,
      currency: this.currency,
    };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Money currency mismatch.');
    }
  }
}
