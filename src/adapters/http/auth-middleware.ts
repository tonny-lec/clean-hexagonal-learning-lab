import { randomUUID } from 'node:crypto';
import type { ActorDto, ActorRole } from '../../application/dto/actor-dto.js';
import {
  AuthenticationRequiredApplicationError,
  InvalidHttpRequestError,
} from '../../application/errors/application-error.js';
import type { TelemetryContext } from '../../application/ports/telemetry-context.js';

/**
 * Learning-only auth adapter.
 *
 * It trusts pre-resolved actor information from HTTP headers so the repository can focus on
 * auth/policy placement. In real systems this actor would come from verified JWT/session/gateway auth.
 */
export function requireHttpActor(headers?: Record<string, string | undefined>): ActorDto {
  const actorId = headers?.['x-actor-id'];
  const actorRole = headers?.['x-actor-role'];
  const customerId = headers?.['x-customer-id'];

  if (!actorId || !actorRole) {
    throw new AuthenticationRequiredApplicationError('Authenticated actor information is required.');
  }

  if (actorRole !== 'admin' && actorRole !== 'customer') {
    throw new InvalidHttpRequestError(`Unsupported actor role: ${actorRole}`);
  }

  const actor: ActorDto = {
    actorId,
    role: actorRole as ActorRole,
  };

  if (customerId) {
    actor.customerId = customerId;
  }

  return actor;
}

export function resolveHttpTelemetry(
  headers?: Record<string, string | undefined>,
  generateRequestId: () => string = randomUUID,
): TelemetryContext {
  const requestId = headers?.['x-request-id'] ?? generateRequestId();

  return {
    source: 'http',
    requestId,
    correlationId: requestId,
    traceId: `trace-${requestId}`,
  };
}
