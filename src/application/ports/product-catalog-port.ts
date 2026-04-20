export interface ProductCatalogPort {
  getUnitPrice(sku: string): number;
}
