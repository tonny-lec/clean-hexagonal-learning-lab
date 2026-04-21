import { describe, expect, it } from 'vitest';
import { handleGetOrderHttp } from '../src/adapters/http/get-order-http-handler.js';
import { handlePlaceOrderHttp } from '../src/adapters/http/place-order-http-handler.js';

describe('HTTP adapters', () => {
  it('maps an HTTP place-order request, actor, and presenter response', async () => {
    const response = await handlePlaceOrderHttp(
      {
        headers: {
          'x-actor-id': 'customer-1-user',
          'x-actor-role': 'customer',
          'x-customer-id': 'customer-1',
        },
        body: JSON.stringify({
          customerId: 'customer-1',
          items: [
            { sku: 'BOOK', quantity: 2 },
            { sku: 'PEN', quantity: 1 },
          ],
          idempotencyKey: 'request-1',
        }),
      },
      async (command) => {
        expect(command.actor).toEqual({
          actorId: 'customer-1-user',
          role: 'customer',
          customerId: 'customer-1',
        });

        return {
          orderId: `mapped-${command.customerId}`,
          totalAmount: { amountInMinor: 2650, currency: 'JPY' },
          paymentConfirmationId: 'payment-1',
        };
      },
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

  it('returns 401 when the actor headers are missing', async () => {
    const response = await handlePlaceOrderHttp(
      {
        body: JSON.stringify({
          customerId: 'customer-1',
          items: [{ sku: 'BOOK', quantity: 1 }],
        }),
      },
      async () => {
        throw new Error('should not be called');
      },
    );

    expect(response).toEqual({
      status: 401,
      body: {
        error: 'AuthenticationRequired',
        message: 'Authenticated actor information is required.',
      },
    });
  });

  it('returns 400 when the request body is invalid', async () => {
    const response = await handlePlaceOrderHttp(
      {
        headers: {
          'x-actor-id': 'customer-1-user',
          'x-actor-role': 'customer',
          'x-customer-id': 'customer-1',
        },
        body: '{not-json',
      },
      async () => {
        throw new Error('should not be called');
      },
    );

    expect(response).toEqual({
      status: 400,
      body: {
        error: 'InvalidHttpRequest',
        message: 'Request body must be valid JSON.',
      },
    });
  });

  it('maps the query use case response for GET /orders/:id with actor context', async () => {
    const response = await handleGetOrderHttp(
      {
        headers: {
          'x-actor-id': 'admin-1',
          'x-actor-role': 'admin',
        },
        params: { orderId: 'order-1' },
      },
      async (query) => {
        expect(query.actor).toEqual({
          actorId: 'admin-1',
          role: 'admin',
        });

        return {
          orderId: query.orderId,
          customerId: 'customer-1',
          lines: [],
          totalAmount: { amountInMinor: 0, currency: 'JPY' },
        };
      },
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
