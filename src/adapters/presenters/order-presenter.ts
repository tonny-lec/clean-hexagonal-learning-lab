import type { OrderSummaryDto, PlaceOrderResultDto } from '../../application/dto/order-dto.js';

export function presentPlaceOrderResultForCli(result: PlaceOrderResultDto): string {
  return [
    'Place order succeeded.',
    `- orderId: ${result.orderId}`,
    `- totalAmount: ${result.totalAmount.amountInMinor} ${result.totalAmount.currency}`,
    `- paymentConfirmationId: ${result.paymentConfirmationId}`,
  ].join('\n');
}

export function presentOrderSummaryForCli(summary: OrderSummaryDto): string {
  const lines = summary.lines
    .map(
      (line) =>
        `  - ${line.sku}: quantity=${line.quantity}, unitPrice=${line.unitPrice.amountInMinor} ${line.unitPrice.currency}`,
    )
    .join('\n');

  return [
    `Order summary for ${summary.orderId}`,
    `customerId: ${summary.customerId}`,
    'lines:',
    lines || '  (no lines)',
    `totalAmount: ${summary.totalAmount.amountInMinor} ${summary.totalAmount.currency}`,
  ].join('\n');
}
