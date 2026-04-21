import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleObservability } from '../src/adapters/console/console-observability.js';

describe('ConsoleObservability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints a structured telemetry log with context and running metric counts', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const observability = new ConsoleObservability();

    await observability.record(
      'order.place.started',
      { customerId: 'customer-1' },
      {
        source: 'http',
        requestId: 'request-1',
        correlationId: 'request-1',
        traceId: 'trace-request-1',
      },
    );

    expect(consoleLog).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(consoleLog.mock.calls[0][0]);
    expect(payload).toMatchObject({
      kind: 'telemetry',
      name: 'order.place.started',
      attributes: { customerId: 'customer-1' },
      context: {
        source: 'http',
        requestId: 'request-1',
        correlationId: 'request-1',
        traceId: 'trace-request-1',
      },
      metrics: {
        'order.place.started': 1,
      },
    });
    expect(typeof payload.recordedAt).toBe('string');
  });
});
