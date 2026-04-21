import { Money } from '../money.js';
import { DomainValidationError } from '../errors.js';

export type PricingLine = {
  sku: string;
  quantity: number;
  unitPrice: Money;
};

export class OrderPricingService {
  calculateSubtotal(lines: PricingLine[]): Money {
    if (lines.length === 0) {
      throw new DomainValidationError('At least one pricing line is required.');
    }

    return lines
      .map((line) => line.unitPrice.multiply(line.quantity))
      .reduce((total, lineAmount) => total.add(lineAmount));
  }

  applyPercentageDiscount(total: Money, percentage: number): Money {
    if (percentage < 0 || percentage > 100) {
      throw new DomainValidationError('Discount percentage must be between 0 and 100.');
    }

    const discountedAmount = Math.floor(total.amountInMinor * (100 - percentage) / 100);
    return Money.fromMinor(discountedAmount, total.currency);
  }
}
