export class DomainValidationError extends Error {
  readonly name = 'DomainValidationError';
}

export class UnknownSkuError extends Error {
  readonly name = 'UnknownSkuError';

  constructor(public readonly sku: string) {
    super(`Unknown SKU: ${sku}`);
  }
}
