import { describe, expect, it } from 'vitest';
import { handleGetOrderHttp } from '../src/adapters/http/get-order-http-handler.js';
import { handlePlaceOrderHttp } from '../src/adapters/http/place-order-http-handler.js';

describe('HTTP adapters', () => {
  it('maps an HTTP place-order request to the use case and presenter', async () => {
    const response = await handlePlaceOrderHttp(
      {
        body: JSON.stringify({
          customerId: 'customer-1',
          items: [
            { sku: 'BOOK', quantity: 2 },
            { sku: 'PEN', quantity: 1 },
          ],
          idempotencyKey: 'request-1',
        }),
      },
      async (command) => ({
        orderId: `mapped-${command.customerId}`,
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
        paymentConfirmationId: 'payment-1',
      }),
    );

    expect(response).toEqual({
      status: 201,
      body: {
        orderId: 'mapped-customer-1',
        totalAmount: { amountInMinor: 2650, currency: 'JPY' },
        paymentConfirmationId: 'payment-1',
      },
    });
  });

  it('returns 400 when the request body is invalid', async () => {
    const response = await handlePlaceOrderHttp({ body: '{not-json' }, async () => {
      throw new Error('should not be called');
    });

    expect(response).toEqual({
      status: 400,
      body: {
        error: 'InvalidHttpRequest',
        message: 'Request body must be valid JSON.',
      },
    });
  });

  it('maps the query use case response for GET /orders/:id', async () => {
    const response = await handleGetOrderHttp(
      { params: { orderId: 'order-1' } },
      async ({ orderId }) => ({
        orderId,
        customerId: 'customer-1',
        lines: [],
        totalAmount: { amountInMinor: 0, currency: 'JPY' },
      }),
    );

    expect(response).toEqual({
      status: 200,
      body: {
        orderId: 'order-1',
        customerId: 'customer-1',
        lines: [],
        totalAmount: { amountInMinor: 0, currency: 'JPY' },
      },
    });
  });
});
