import type { FulfillmentPort, FulfillmentReceipt } from '../../application/ports/fulfillment-port.js';
import type { Order } from '../../domain/order.js';

export class ConsoleFulfillmentService implements FulfillmentPort {
  async request(order: Order, paymentConfirmationId: string, requestId?: string): Promise<FulfillmentReceipt> {
    const fulfillmentConfirmationId = requestId ? `fulfill-${requestId}` : `fulfill-${order.id}`;
    console.log(
      `Requesting fulfillment for ${order.id}. Payment: ${paymentConfirmationId}. Confirmation: ${fulfillmentConfirmationId}`,
    );

    return {
      orderId: order.id,
      paymentConfirmationId,
      fulfillmentConfirmationId,
    };
  }
}
