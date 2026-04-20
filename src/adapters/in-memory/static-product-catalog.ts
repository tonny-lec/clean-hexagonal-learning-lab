import type { ProductCatalogPort } from '../../application/ports/product-catalog-port.js';
import { UnknownSkuError } from '../../domain/errors.js';
import { Money } from '../../domain/money.js';

export class StaticProductCatalog implements ProductCatalogPort {
  constructor(
    private readonly prices: Record<string, number>,
    private readonly currency = 'JPY',
  ) {}

  getUnitPrice(sku: string): Money {
    const price = this.prices[sku];

    if (price === undefined) {
      throw new UnknownSkuError(sku);
    }

    return Money.fromMinor(price, this.currency);
  }
}
