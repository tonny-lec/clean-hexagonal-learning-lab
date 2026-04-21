import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { IntegrationEventPublisherPort } from '../../application/ports/integration-event-publisher-port.js';
import type { IntegrationEventSubscriberPort } from '../../application/ports/integration-event-subscriber-port.js';
import type { IntegrationEventVersion } from '../../application/integration-events/order-integration-event.js';
import type { OrderReadModelPort } from '../../application/ports/order-read-model-port.js';
import { dispatchOutbox } from '../../application/use-cases/dispatch-outbox.js';
import { getOrderSummary } from '../../application/use-cases/get-order-summary.js';
import type { PlaceOrderDependencies } from '../../application/use-cases/place-order.js';
import { placeOrder } from '../../application/use-cases/place-order.js';
import { resolveHttpTelemetry } from './auth-middleware.js';
import { handleDispatchOutboxHttp } from './dispatch-outbox-http-handler.js';
import { handleGetOrderHttp } from './get-order-http-handler.js';
import { handlePlaceOrderHttp } from './place-order-http-handler.js';

export function createDemoHttpServer(dependencies: PlaceOrderDependencies & {
  orderReadModel: OrderReadModelPort;
  integrationEventPublisher: IntegrationEventPublisherPort;
  integrationEventSubscriber?: IntegrationEventSubscriberPort;
}) {
  return createServer(async (req, res) => {
    const url = req.url ?? '/';
    const headers = normalizeHeaders(req.headers);

    if (req.method === 'POST' && url === '/orders') {
      const body = await readBody(req);
      const response = await handlePlaceOrderHttp({ body, headers }, (command) => placeOrder(command, dependencies));
      res.writeHead(response.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response.body));
      return;
    }

    if (req.method === 'POST' && url === '/dispatch-outbox') {
      const response = await handleDispatchOutboxHttp((command) =>
        dispatchOutbox(
          {
            ...command,
            telemetry: resolveHttpTelemetry(headers),
            integrationEventVersions: getConfiguredIntegrationEventVersions(),
          },
          {
            outbox: dependencies.outbox,
            integrationEventPublisher: dependencies.integrationEventPublisher,
            integrationEventSubscriber: dependencies.integrationEventSubscriber,
            orderReadModel: dependencies.orderReadModel,
            observability: dependencies.observability,
            auditLog: dependencies.auditLog,
          },
        ),
      );
      res.writeHead(response.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response.body));
      return;
    }

    if (req.method === 'GET' && url.startsWith('/orders/')) {
      const orderId = url.replace('/orders/', '');
      const response = await handleGetOrderHttp({ params: { orderId }, headers }, (query) =>
        getOrderSummary(query, {
          orderReadModel: dependencies.orderReadModel,
          authorizationPolicy: dependencies.authorizationPolicy,
        }),
      );
      res.writeHead(response.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response.body));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'NotFound', message: 'Route not found.' }));
  });
}

export async function startDemoHttpServer(
  dependencies: PlaceOrderDependencies & {
    orderReadModel: OrderReadModelPort;
    integrationEventPublisher: IntegrationEventPublisherPort;
    integrationEventSubscriber?: IntegrationEventSubscriberPort;
  },
  port = 3000,
): Promise<string> {
  const server = createDemoHttpServer(dependencies);

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  const address = server.address() as AddressInfo;
  return `HTTP demo server listening at http://127.0.0.1:${address.port}`;
}

async function readBody(request: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

function getConfiguredIntegrationEventVersions(): IntegrationEventVersion[] {
  const raw = process.env.INTEGRATION_EVENT_VERSIONS ?? 'v1';
  const versions = raw
    .split(',')
    .map((version) => version.trim())
    .filter((version): version is IntegrationEventVersion => version === 'v1' || version === 'v2');

  return versions.length > 0 ? versions : ['v1'];
}
