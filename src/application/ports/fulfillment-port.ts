import type { Order } from '../../domain/order.js';

export type FulfillmentReceipt = {
  orderId: string;
  paymentConfirmationId: string;
  fulfillmentConfirmationId: string;
};

export interface FulfillmentPort {
  request(order: Order, paymentConfirmationId: string, requestId?: string): Promise<FulfillmentReceipt> | FulfillmentReceipt;
}
