import type { FulfillmentPort, FulfillmentReceipt } from '../../application/ports/fulfillment-port.js';
import type { Order } from '../../domain/order.js';
import type { WarehouseClient, WarehouseDispatchRequest } from './warehouse-client.js';

export class WarehouseAclFulfillmentService implements FulfillmentPort {
  constructor(private readonly dependencies: { client: WarehouseClient }) {}

  async request(order: Order, paymentConfirmationId: string, requestId?: string): Promise<FulfillmentReceipt> {
    const warehouseRequest = this.mapOrderToWarehouseRequest(order, paymentConfirmationId, requestId);
    const warehouseResponse = await this.dependencies.client.createDispatchTicket(warehouseRequest);

    return {
      orderId: order.id,
      paymentConfirmationId,
      fulfillmentConfirmationId: warehouseResponse.dispatchTicketNumber,
    };
  }

  private mapOrderToWarehouseRequest(
    order: Order,
    paymentConfirmationId: string,
    requestId?: string,
  ): WarehouseDispatchRequest {
    return {
      dispatchRequestNumber: requestId ?? order.id,
      salesOrderNumber: order.id,
      buyerReference: order.customerId,
      paymentReference: paymentConfirmationId,
      items: order.lines.map((line) => ({
        stockKeepingUnit: line.sku,
        units: line.quantity,
        priceInMinor: line.unitPrice.amountInMinor,
        currencyCode: line.unitPrice.currency,
      })),
    };
  }
}
