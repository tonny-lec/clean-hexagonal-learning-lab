import { ApplicationError, InvalidHttpRequestError } from '../../application/errors/application-error.js';
import type { PlaceOrderResultDto } from '../../application/dto/order-dto.js';
import type { PlaceOrderCommand } from '../../application/use-cases/place-order.js';
import { requireHttpActor } from './auth-middleware.js';

export type HttpResponse<TBody> = {
  status: number;
  body: TBody;
};

export async function handlePlaceOrderHttp(
  request: { body?: string; headers?: Record<string, string | undefined> },
  execute: (command: PlaceOrderCommand) => Promise<PlaceOrderResultDto>,
): Promise<HttpResponse<PlaceOrderResultDto | { error: string; message: string }>> {
  try {
    const actor = requireHttpActor(request.headers);
    const parsed = parsePlaceOrderBody(request.body);
    const result = await execute({ ...parsed, actor });
    return { status: 201, body: result };
  } catch (error) {
    return mapHttpError(error);
  }
}

function parsePlaceOrderBody(body: string | undefined): PlaceOrderCommand {
  if (!body) {
    throw new InvalidHttpRequestError('Request body is required.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (cause) {
    throw new InvalidHttpRequestError('Request body must be valid JSON.', { cause });
  }

  const request = parsed as Partial<PlaceOrderCommand>;
  return {
    customerId: request.customerId ?? '',
    idempotencyKey: request.idempotencyKey,
    items: Array.isArray(request.items)
      ? request.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
        }))
      : [],
  };
}

function mapHttpError(error: unknown): HttpResponse<{ error: string; message: string }> {
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
