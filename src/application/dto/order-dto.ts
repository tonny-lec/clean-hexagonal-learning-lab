export type MoneyDto = {
  amountInMinor: number;
  currency: string;
};

export type OrderLineDto = {
  sku: string;
  quantity: number;
  unitPrice: MoneyDto;
};

export type PlaceOrderResultDto = {
  orderId: string;
  totalAmount: MoneyDto;
  paymentConfirmationId: string;
};

export type OrderSummaryDto = {
  orderId: string;
  customerId: string;
  lines: OrderLineDto[];
  totalAmount: MoneyDto;
};
