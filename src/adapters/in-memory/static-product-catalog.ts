import type { ProductCatalogPort } from '../../application/ports/product-catalog-port.js';

export class StaticProductCatalog implements ProductCatalogPort {
  constructor(private readonly prices: Record<string, number>) {}

  getUnitPrice(sku: string): number {
    const price = this.prices[sku];

    if (price === undefined) {
      throw new Error(`Unknown SKU: ${sku}`);
    }

    return price;
  }
}
