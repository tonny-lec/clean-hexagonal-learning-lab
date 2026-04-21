import { Money } from '../money.js';

export type CustomerTier = 'standard' | 'premium';

export type OrderPlacementDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export class OrderPlacementPolicy {
  constructor(
    private readonly limits: {
      standardLimit: Money;
      premiumLimit: Money;
    },
  ) {}

  evaluate(input: { customerTier: CustomerTier; orderTotal: Money }): OrderPlacementDecision {
    const limit = input.customerTier === 'premium' ? this.limits.premiumLimit : this.limits.standardLimit;

    if (input.orderTotal.currency !== limit.currency) {
      return {
        allowed: false,
        reason: 'Order total currency does not match policy currency.',
      };
    }

    if (input.orderTotal.amountInMinor > limit.amountInMinor) {
      return {
        allowed: false,
        reason: `${capitalize(input.customerTier)} customers cannot place orders above ${limit.amountInMinor} ${limit.currency}.`,
      };
    }

    return { allowed: true };
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
