export type OrderLine = {
  sku: string;
  quantity: number;
  unitPrice: number;
};

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly lines: OrderLine[],
  ) {
    if (lines.length === 0) {
      throw new Error('An order must contain at least one item.');
    }

    for (const line of lines) {
      if (line.quantity <= 0) {
        throw new Error('Order line quantity must be greater than zero.');
      }

      if (line.unitPrice < 0) {
        throw new Error('Order line unit price must not be negative.');
      }
    }
  }

  totalAmount(): number {
    return this.lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  }
}
