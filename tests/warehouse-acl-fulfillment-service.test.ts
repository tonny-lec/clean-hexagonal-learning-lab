import { describe, expect, it } from 'vitest';
import { WarehouseAclFulfillmentService } from '../src/adapters/fulfillment/warehouse-acl-fulfillment-service.js';
import { Order } from '../src/domain/order.js';
import { Money } from '../src/domain/money.js';

describe('WarehouseAclFulfillmentService', () => {
  it('translates the internal order into a warehouse dispatch request and maps the response back', async () => {
    const captured: unknown[] = [];

    const service = new WarehouseAclFulfillmentService({
      client: {
        async createDispatchTicket(request) {
          captured.push(request);
          return {
            dispatchTicketNumber: 'dispatch-1',
            warehouseReference: 'wh-order-1',
          };
        },
      },
    });

    const order = Order.rehydrate('order-1', 'customer-1', [
      { sku: 'BOOK', quantity: 2, unitPrice: Money.fromMinor(1200, 'JPY') },
      { sku: 'PEN', quantity: 1, unitPrice: Money.fromMinor(250, 'JPY') },
    ]);

    const receipt = await service.request(order, 'payment-1', 'request-1');

    expect(captured).toEqual([
      {
        dispatchRequestNumber: 'request-1',
        salesOrderNumber: 'order-1',
        buyerReference: 'customer-1',
        paymentReference: 'payment-1',
        items: [
          { stockKeepingUnit: 'BOOK', units: 2, priceInMinor: 1200, currencyCode: 'JPY' },
          { stockKeepingUnit: 'PEN', units: 1, priceInMinor: 250, currencyCode: 'JPY' },
        ],
      },
    ]);

    expect(receipt).toEqual({
      orderId: 'order-1',
      paymentConfirmationId: 'payment-1',
      fulfillmentConfirmationId: 'dispatch-1',
    });
  });

  it('falls back to the order id when no explicit request id is provided', async () => {
    const captured: unknown[] = [];

    const service = new WarehouseAclFulfillmentService({
      client: {
        async createDispatchTicket(request) {
          captured.push(request);
          return {
            dispatchTicketNumber: 'dispatch-2',
            warehouseReference: 'wh-order-2',
          };
        },
      },
    });

    const order = Order.rehydrate('order-2', 'customer-2', [
      { sku: 'BOOK', quantity: 1, unitPrice: Money.fromMinor(1200, 'JPY') },
    ]);

    await service.request(order, 'payment-2');

    expect(captured).toEqual([
      expect.objectContaining({
        dispatchRequestNumber: 'order-2',
        salesOrderNumber: 'order-2',
      }),
    ]);
  });
});
