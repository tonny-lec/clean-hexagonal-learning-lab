export type TelemetryContext = {
  source?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
};

export type TelemetryContextInput = TelemetryContext;

export function createTelemetryContext(
  input: TelemetryContextInput | undefined,
  defaults: TelemetryContextInput = {},
): TelemetryContext | undefined {
  const requestId = input?.requestId ?? defaults.requestId;
  const correlationId = input?.correlationId ?? defaults.correlationId ?? requestId;
  const traceId = input?.traceId ?? defaults.traceId ?? (correlationId ? `trace-${correlationId}` : undefined);
  const source = input?.source ?? defaults.source;

  if (!source && !requestId && !correlationId && !traceId) {
    return undefined;
  }

  return {
    ...(source ? { source } : {}),
    ...(requestId ? { requestId } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...(traceId ? { traceId } : {}),
  };
}
