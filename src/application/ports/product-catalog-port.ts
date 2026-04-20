import type { Money } from '../../domain/money.js';

export interface ProductCatalogPort {
  getUnitPrice(sku: string): Promise<Money> | Money;
}
