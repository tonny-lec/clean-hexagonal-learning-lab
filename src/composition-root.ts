import { OrderAuthorizationPolicy } from './application/policies/order-authorization-policy.js';
import { pollOutbox } from './application/use-cases/poll-outbox.js';
import { BrokerLikeIntegrationEventPublisher } from './adapters/broker-like/broker-like-integration-event-publisher.js';
import { ConsoleAuditLog } from './adapters/console/console-audit-log.js';
import { ConsoleIntegrationEventPublisher } from './adapters/console/console-integration-event-publisher.js';
import { ConsoleObservability } from './adapters/console/console-observability.js';
import { ConsolePaymentGateway } from './adapters/console/console-payment-gateway.js';
import { ConsoleFulfillmentService } from './adapters/fulfillment/console-fulfillment-service.js';
import { FakeFulfillmentService } from './adapters/fulfillment/fake-fulfillment-service.js';
import { FailingFulfillmentService } from './adapters/fulfillment/failing-fulfillment-service.js';
import { FakeWarehouseClient } from './adapters/fulfillment/fake-warehouse-client.js';
import { WarehouseAclFulfillmentService } from './adapters/fulfillment/warehouse-acl-fulfillment-service.js';
import { InMemoryDeliveryTriggerConsumer } from './adapters/in-memory/in-memory-delivery-trigger-consumer.js';
import { InMemoryOrderReadModel } from './adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOrderRepository } from './adapters/in-memory/in-memory-order-repository.js';
import { InMemoryOutbox } from './adapters/in-memory/in-memory-outbox.js';
import { InMemorySubscriberDeliveryFailureStore } from './adapters/in-memory/in-memory-subscriber-delivery-failure-store.js';
import { NoopUnitOfWork } from './adapters/in-memory/noop-unit-of-work.js';
import { StaticProductCatalog } from './adapters/in-memory/static-product-catalog.js';
import { NatsIntegrationEventPublisher } from './adapters/nats/nats-integration-event-publisher.js';
import { FakePaymentGateway } from './adapters/payment/fake-payment-gateway.js';
import { FailingPaymentGateway } from './adapters/payment/failing-payment-gateway.js';
import { StripeLikePaymentGateway } from './adapters/payment/stripe-like-payment-gateway.js';
import { FailOnceIntegrationEventSubscriber } from './adapters/subscribers/fail-once-integration-event-subscriber.js';
import { FanOutIntegrationEventSubscriber } from './adapters/subscribers/fan-out-integration-event-subscriber.js';
import { OrderSummaryProjectorSubscriber } from './adapters/subscribers/order-summary-projector-subscriber.js';
import { StaticSubscriberFailurePolicy } from './adapters/subscribers/static-subscriber-failure-policy.js';
import { OutboxDeliveryWorker } from './adapters/worker/outbox-delivery-worker.js';
import { Money } from './domain/money.js';

function createPaymentGateway() {
  const mode = process.env.PAYMENT_GATEWAY ?? 'console';

  if (mode === 'fake') {
    return new FakePaymentGateway();
  }

  if (mode === 'stripe-like') {
    return new StripeLikePaymentGateway();
  }

  if (mode === 'failing') {
    return new FailingPaymentGateway('Configured failing payment gateway.');
  }

  return new ConsolePaymentGateway();
}

function createFulfillmentService() {
  const mode = process.env.FULFILLMENT_SERVICE ?? 'console';

  if (mode === 'fake') {
    return new FakeFulfillmentService();
  }

  if (mode === 'failing') {
    return new FailingFulfillmentService('Configured fulfillment service failure.');
  }

  if (mode === 'warehouse-acl') {
    return new WarehouseAclFulfillmentService({
      client: new FakeWarehouseClient(),
    });
  }

  return new ConsoleFulfillmentService();
}

function createIntegrationEventPublisher() {
  const mode = process.env.INTEGRATION_PUBLISHER ?? 'console';

  if (mode === 'broker-like') {
    return new BrokerLikeIntegrationEventPublisher();
  }

  if (mode === 'nats') {
    const server = process.env.NATS_URL ?? 'nats://127.0.0.1:4222';
    const subjectPrefix = process.env.NATS_SUBJECT_PREFIX ?? 'events';

    return new NatsIntegrationEventPublisher({
      servers: [server],
      subjectPrefix,
    });
  }

  return new ConsoleIntegrationEventPublisher();
}

export function createDemoDependencies() {
  const orderRepository = new InMemoryOrderRepository();
  const orderReadModel = new InMemoryOrderReadModel();
  const catalog = new StaticProductCatalog({
    BOOK: 1200,
    PEN: 250,
    BAG: 3200,
  });
  const paymentGateway = createPaymentGateway();
  const fulfillmentService = createFulfillmentService();
  const integrationEventPublisher = createIntegrationEventPublisher();
  const subscriberFailureStore = new InMemorySubscriberDeliveryFailureStore();
  const subscriberFailurePolicy = new StaticSubscriberFailurePolicy({
    'order-summary-projector': { maxAttempts: 3, retryDelaySeconds: 60 },
  });
  const observability = new ConsoleObservability();
  const auditLog = new ConsoleAuditLog();
  const projectorSubscriber = new OrderSummaryProjectorSubscriber(orderReadModel);
  const integrationEventSubscribers = [
    process.env.SUBSCRIBER_FAILURE_MODE === 'order-summary-projector-fail-once'
      ? new FailOnceIntegrationEventSubscriber(
          projectorSubscriber.subscriberName,
          projectorSubscriber,
          'projector temporarily unavailable',
        )
      : projectorSubscriber,
  ];
  const integrationEventSubscriber = new FanOutIntegrationEventSubscriber(integrationEventSubscribers, {
    failureStore: subscriberFailureStore,
    failurePolicy: subscriberFailurePolicy,
    observability,
    auditLog,
  });
  const outbox = new InMemoryOutbox();
  const unitOfWork = new NoopUnitOfWork();
  const authorizationPolicy = new OrderAuthorizationPolicy({
    highValueThreshold: Money.fromMinor(5000, 'JPY'),
  });
  const deliveryTriggerConsumer = new InMemoryDeliveryTriggerConsumer();
  const deliveryWorker = new OutboxDeliveryWorker({
    triggerConsumer: deliveryTriggerConsumer,
    runPollOutbox: (command) =>
      pollOutbox(command, {
        outbox,
        integrationEventPublisher,
        integrationEventSubscriber,
        orderReadModel,
        observability,
        auditLog,
      }),
    observability,
    auditLog,
  });

  return {
    catalog,
    orderRepository,
    orderReadModel,
    paymentGateway,
    fulfillmentService,
    integrationEventPublisher,
    integrationEventSubscriber,
    integrationEventSubscribers,
    subscriberFailureStore,
    subscriberFailurePolicy,
    outbox,
    unitOfWork,
    authorizationPolicy,
    observability,
    auditLog,
    deliveryTriggerConsumer,
    deliveryWorker,
    idGenerator: () => `order-${Math.random().toString(36).slice(2, 10)}`,
  };
}
