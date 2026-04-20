import { ApplicationError, InvalidHttpRequestError } from '../../application/errors/application-error.js';
import type { OrderSummaryDto } from '../../application/dto/order-dto.js';
import type { GetOrderSummaryQuery } from '../../application/use-cases/get-order-summary.js';

export type HttpResponse<TBody> = {
  status: number;
  body: TBody;
};

export async function handleGetOrderHttp(
  request: { params?: Record<string, string | undefined> },
  execute: (query: GetOrderSummaryQuery) => Promise<OrderSummaryDto>,
): Promise<HttpResponse<OrderSummaryDto | { error: string; message: string }>> {
  try {
    const orderId = request.params?.orderId;
    if (!orderId) {
      throw new InvalidHttpRequestError('orderId route parameter is required.');
    }

    const result = await execute({ orderId });
    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof ApplicationError) {
      return {
        status: error.statusCode,
        body: {
          error: error.code,
          message: error.message,
        },
      };
    }

    return {
      status: 500,
      body: {
        error: 'InternalServerError',
        message: 'An unexpected error occurred.',
      },
    };
  }
}
