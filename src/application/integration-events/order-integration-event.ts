export type IntegrationEventVersion = 'v1' | 'v2';

export type IntegrationEventLine = {
  sku: string;
  quantity: number;
  unitPrice: {
    amountInMinor: number;
    currency: string;
  };
};

export type OrderPlacedIntegrationEventV1 = {
  type: 'order.placed.v1';
  schemaVersion: 1;
  integrationEventId: string;
  occurredAt: string;
  orderId: string;
  customerId: string;
  lines: IntegrationEventLine[];
  totalAmount: {
    amountInMinor: number;
    currency: string;
  };
};

export type OrderPlacedIntegrationEventV2 = {
  type: 'order.placed.v2';
  schemaVersion: 2;
  integrationEventId: string;
  occurredAt: string;
  orderId: string;
  customer: {
    id: string;
  };
  lineItems: IntegrationEventLine[];
  totals: {
    amountInMinor: number;
    currency: string;
  };
  lineCount: number;
};

export type OrderPlacedIntegrationEvent = OrderPlacedIntegrationEventV1 | OrderPlacedIntegrationEventV2;
