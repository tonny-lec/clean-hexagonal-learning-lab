export type OrderPlacedIntegrationEvent = {
  type: 'order.placed.v1';
  integrationEventId: string;
  occurredAt: string;
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
