import type { Money } from './money.js';
import { DomainValidationError } from './errors.js';

export type OrderPlacedEvent = {
  type: 'order.placed';
  orderId: string;
  customerId: string;
  lines: Array<{
    sku: string;
    quantity: number;
    unitPrice: {
      amountInMinor: number;
      currency: string;
    };
  }>;
  totalAmount: {
    amountInMinor: number;
    currency: string;
  };
};

export type OrderLine = {
  sku: string;
  quantity: number;
  unitPrice: Money;
};

/**
 * Aggregate Root for the order consistency boundary in this learning project.
 *
 * - External callers create or rehydrate the aggregate through Order.
 * - OrderLine lives inside the aggregate boundary.
 * - Payment and persistence stay outside and are coordinated through ports/use cases.
 */
export class Order {
  private readonly domainEvents: OrderPlacedEvent[];

  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly lines: OrderLine[],
    domainEvents: OrderPlacedEvent[] = [],
  ) {
    if (lines.length === 0) {
      throw new DomainValidationError('An order must contain at least one item.');
    }

    for (const line of lines) {
      if (line.quantity <= 0) {
        throw new DomainValidationError('Order line quantity must be greater than zero.');
      }
    }

    this.domainEvents = domainEvents;
  }

  static place(id: string, customerId: string, lines: OrderLine[]): Order {
    const order = new Order(id, customerId, lines);
    return new Order(order.id, order.customerId, order.lines, [
      {
        type: 'order.placed',
        orderId: order.id,
        customerId: order.customerId,
        lines: order.lines.map((line) => ({
          sku: line.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice.toJSON(),
        })),
        totalAmount: order.totalAmount().toJSON(),
      },
    ]);
  }

  static rehydrate(id: string, customerId: string, lines: OrderLine[]): Order {
    return new Order(id, customerId, lines);
  }

  totalAmount(): Money {
    return this.lines
      .map((line) => line.unitPrice.multiply(line.quantity))
      .reduce((total, lineAmount) => total.add(lineAmount));
  }

  pullDomainEvents(): OrderPlacedEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
