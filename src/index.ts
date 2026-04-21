import { runPlaceOrderBatch } from './adapters/batch/place-order-batch.js';
import { runGetOrderCli, runPlaceOrderCli } from './adapters/cli/order-cli.js';
import { startDemoHttpServer } from './adapters/http/create-demo-http-server.js';
import type { IntegrationEventVersion } from './application/integration-events/order-integration-event.js';
import { dispatchOutbox } from './application/use-cases/dispatch-outbox.js';
import { getOrderSummary } from './application/use-cases/get-order-summary.js';
import { pollOutbox } from './application/use-cases/poll-outbox.js';
import { placeOrder } from './application/use-cases/place-order.js';
import { replaySubscriberFailures } from './application/use-cases/replay-subscriber-failures.js';
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
        getDeliveryDependencies(),
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
        getDeliveryDependencies(),
      ),
      null,
      2,
    ),
  );
} else if (mode === 'worker') {
  const placed = await placeOrder(
    {
      actor: adminActor,
      customerId: 'worker-demo',
      items: [{ sku: 'BOOK', quantity: 1 }],
      idempotencyKey: 'worker-demo-key',
    },
    dependencies,
  );

  const requestedAt = new Date().toISOString();
  const trigger = dependencies.deliveryTriggerConsumer.enqueue({
    kind: 'queue-message',
    requestedAt,
  });

  const workerRun = await dependencies.deliveryWorker.runUntilIdle({
    defaultCommand: {
      batchSize: 100,
      cycles: 3,
      startAt: requestedAt,
      stepSeconds: 61,
      retryDelaySeconds: 60,
      maxAttempts: 3,
      integrationEventVersions,
    },
  });

  const summary = await getOrderSummary(
    { orderId: placed.orderId, actor: adminActor },
    {
      orderReadModel: dependencies.orderReadModel,
      authorizationPolicy: dependencies.authorizationPolicy,
    },
  );

  console.log(
    JSON.stringify(
      {
        trigger,
        workerRun,
        summary,
      },
      null,
      2,
    ),
  );
} else if (mode === 'replay') {
  const placed = await placeOrder(
    {
      actor: adminActor,
      customerId: 'replay-demo',
      items: [{ sku: 'BOOK', quantity: 1 }],
      idempotencyKey: 'replay-demo-key',
    },
    dependencies,
  );

  const dispatchResult = await dispatchOutbox(
    {
      batchSize: 100,
      integrationEventVersions,
      now: '2030-01-01T00:00:00.000Z',
    },
    getDeliveryDependencies(),
  );

  const beforeReplay = await getOrderSummary(
    { orderId: placed.orderId, actor: adminActor },
    {
      orderReadModel: dependencies.orderReadModel,
      authorizationPolicy: dependencies.authorizationPolicy,
    },
  ).then(
    (summary) => ({ status: 'available' as const, summary }),
    (error) => ({ status: 'missing' as const, error: error instanceof Error ? error.message : 'unknown-error' }),
  );

  const replayableBefore = structuredClone(
    await dependencies.subscriberFailureStore.listReplayable(100, '2030-01-01T00:01:01.000Z'),
  );

  const replayResult = await replaySubscriberFailures(
    {
      batchSize: 100,
      now: '2030-01-01T00:01:01.000Z',
    },
    {
      failureStore: dependencies.subscriberFailureStore,
      subscribers: dependencies.integrationEventSubscribers,
      failurePolicy: dependencies.subscriberFailurePolicy,
      observability: dependencies.observability,
      auditLog: dependencies.auditLog,
    },
  );

  const replayableAfter = await dependencies.subscriberFailureStore.listReplayable(100, '2030-01-01T00:02:02.000Z');
  const deadLettersAfter = await dependencies.subscriberFailureStore.listDeadLetters(100);

  const afterReplay = await getOrderSummary(
    { orderId: placed.orderId, actor: adminActor },
    {
      orderReadModel: dependencies.orderReadModel,
      authorizationPolicy: dependencies.authorizationPolicy,
    },
  ).then(
    (summary) => ({ status: 'available' as const, summary }),
    (error) => ({ status: 'missing' as const, error: error instanceof Error ? error.message : 'unknown-error' }),
  );

  console.log(
    JSON.stringify(
      {
        dispatchResult,
        subscriberFailures: {
          replayableBefore,
          replayableAfter,
          deadLettersAfter,
        },
        beforeReplay,
        replayResult,
        afterReplay,
      },
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
    getDeliveryDependencies(),
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

function getDeliveryDependencies() {
  return {
    outbox: dependencies.outbox,
    integrationEventPublisher: dependencies.integrationEventPublisher,
    integrationEventSubscriber: dependencies.integrationEventSubscriber,
    orderReadModel: dependencies.orderReadModel,
    observability: dependencies.observability,
    auditLog: dependencies.auditLog,
  };
}
