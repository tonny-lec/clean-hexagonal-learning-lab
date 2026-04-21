import { runPlaceOrderBatch } from './adapters/batch/place-order-batch.js';
import { runGetOrderCli, runPlaceOrderCli } from './adapters/cli/order-cli.js';
import { startDemoHttpServer } from './adapters/http/create-demo-http-server.js';
import { dispatchOutbox } from './application/use-cases/dispatch-outbox.js';
import { getOrderSummary } from './application/use-cases/get-order-summary.js';
import { pollOutbox } from './application/use-cases/poll-outbox.js';
import { placeOrder } from './application/use-cases/place-order.js';
import type { IntegrationEventVersion } from './application/integration-events/order-integration-event.js';
import { createDemoDependencies } from './composition-root.js';

const dependencies = createDemoDependencies();
const mode = process.argv[2] ?? 'cli';

const adminActor = {
  actorId: 'admin-demo',
  role: 'admin' as const,
};

const integrationEventVersions = getConfiguredIntegrationEventVersions();

if (mode === 'http') {
  console.log(await startDemoHttpServer(dependencies));
} else if (mode === 'dispatch') {
  console.log(
    JSON.stringify(
      await dispatchOutbox(
        { batchSize: 100, integrationEventVersions },
        {
          outbox: dependencies.outbox,
          integrationEventPublisher: dependencies.integrationEventPublisher,
          integrationEventSubscriber: dependencies.integrationEventSubscriber,
          orderReadModel: dependencies.orderReadModel,
          observability: dependencies.observability,
          auditLog: dependencies.auditLog,
        },
      ),
      null,
      2,
    ),
  );
} else if (mode === 'poller') {
  await placeOrder(
    {
      actor: adminActor,
      customerId: 'poller-demo',
      items: [{ sku: 'BOOK', quantity: 1 }],
      idempotencyKey: 'poller-demo-key',
    },
    dependencies,
  );

  console.log(
    JSON.stringify(
      await pollOutbox(
        {
          batchSize: 100,
          cycles: 3,
          retryDelaySeconds: 60,
          maxAttempts: 3,
          integrationEventVersions,
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
      null,
      2,
    ),
  );
} else if (mode === 'batch') {
  const results = await runPlaceOrderBatch(
    [
      {
        actor: adminActor,
        customerId: 'batch-customer-1',
        items: [{ sku: 'BOOK', quantity: 1 }],
        idempotencyKey: 'batch-1',
      },
      {
        actor: adminActor,
        customerId: 'batch-customer-2',
        items: [{ sku: 'PEN', quantity: 3 }],
        idempotencyKey: 'batch-2',
      },
    ],
    (command) => placeOrder(command, dependencies),
  );

  console.log(JSON.stringify(results, null, 2));
} else if (mode === 'query') {
  const placed = await placeOrder(
    {
      actor: adminActor,
      customerId: 'query-demo',
      items: [{ sku: 'BOOK', quantity: 2 }],
      idempotencyKey: 'query-demo-key',
    },
    dependencies,
  );
  await dispatchOutbox(
    { batchSize: 100, integrationEventVersions },
    {
      outbox: dependencies.outbox,
      integrationEventPublisher: dependencies.integrationEventPublisher,
      integrationEventSubscriber: dependencies.integrationEventSubscriber,
      orderReadModel: dependencies.orderReadModel,
      observability: dependencies.observability,
      auditLog: dependencies.auditLog,
    },
  );
  console.log(`Created ${placed.orderId}`);
  console.log(
    await runGetOrderCli(placed.orderId, (query) =>
      getOrderSummary(
        { ...query, actor: adminActor },
        {
          orderReadModel: dependencies.orderReadModel,
          authorizationPolicy: dependencies.authorizationPolicy,
        },
      ),
    ),
  );
} else {
  console.log(
    await runPlaceOrderCli(
      {
        actor: adminActor,
        customerId: 'customer-demo',
        items: [
          { sku: 'BOOK', quantity: 2 },
          { sku: 'PEN', quantity: 1 },
        ],
        idempotencyKey: 'cli-demo-key',
      },
      (command) => placeOrder(command, dependencies),
    ),
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
