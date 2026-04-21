import type { FulfillmentPort, FulfillmentReceipt } from '../../application/ports/fulfillment-port.js';
import type { Order } from '../../domain/order.js';

export class FakeFulfillmentService implements FulfillmentPort {
  async request(order: Order, paymentConfirmationId: string, requestId?: string): Promise<FulfillmentReceipt> {
    return {
      orderId: order.id,
      paymentConfirmationId,
      fulfillmentConfirmationId: requestId ? `fake-fulfillment-${requestId}` : `fake-fulfillment-${order.id}`,
    };
  }
}
