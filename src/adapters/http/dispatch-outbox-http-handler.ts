import { ApplicationError } from '../../application/errors/application-error.js';
import type { DispatchOutboxResult } from '../../application/use-cases/dispatch-outbox.js';

export type HttpResponse<TBody> = {
  status: number;
  body: TBody;
};

export async function handleDispatchOutboxHttp(
  execute: (command: { batchSize?: number }) => Promise<DispatchOutboxResult>,
): Promise<HttpResponse<DispatchOutboxResult | { error: string; message: string }>> {
  try {
    return {
      status: 200,
      body: await execute({ batchSize: 100 }),
    };
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
