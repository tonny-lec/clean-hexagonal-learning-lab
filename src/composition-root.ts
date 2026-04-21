import { OrderAuthorizationPolicy } from './application/policies/order-authorization-policy.js';
import { pollOutbox } from './application/use-cases/poll-outbox.js';
import { BrokerLikeIntegrationEventPublisher } from './adapters/broker-like/broker-like-integration-event-publisher.js';
import { ConsoleAuditLog } from './adapters/console/console-audit-log.js';
import { ConsoleIntegrationEventPublisher } from './adapters/console/console-integration-event-publisher.js';
import { ConsoleObservability } from './adapters/console/console-observability.js';
import { ConsolePaymentGateway } from './adapters/console/console-payment-gateway.js';
import { InMemoryDeliveryTriggerConsumer } from './adapters/in-memory/in-memory-delivery-trigger-consumer.js';
import { InMemoryOrderReadModel } from './adapters/in-memory/in-memory-order-read-model.js';
import { InMemoryOrderRepository } from './adapters/in-memory/in-memory-order-repository.js';
import { InMemoryOutbox } from './adapters/in-memory/in-memory-outbox.js';
import { NoopUnitOfWork } from './adapters/in-memory/noop-unit-of-work.js';
import { StaticProductCatalog } from './adapters/in-memory/static-product-catalog.js';
import { FakePaymentGateway } from './adapters/payment/fake-payment-gateway.js';
import { FailingPaymentGateway } from './adapters/payment/failing-payment-gateway.js';
import { StripeLikePaymentGateway } from './adapters/payment/stripe-like-payment-gateway.js';
import { FanOutIntegrationEventSubscriber } from './adapters/subscribers/fan-out-integration-event-subscriber.js';
import { OrderSummaryProjectorSubscriber } from './adapters/subscribers/order-summary-projector-subscriber.js';
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

function createIntegrationEventPublisher() {
  const mode = process.env.INTEGRATION_PUBLISHER ?? 'console';

  if (mode === 'broker-like') {
    return new BrokerLikeIntegrationEventPublisher();
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
  const integrationEventPublisher = createIntegrationEventPublisher();
  const integrationEventSubscriber = new FanOutIntegrationEventSubscriber([
    new OrderSummaryProjectorSubscriber(orderReadModel),
  ]);
  const outbox = new InMemoryOutbox();
  const unitOfWork = new NoopUnitOfWork();
  const authorizationPolicy = new OrderAuthorizationPolicy({
    highValueThreshold: Money.fromMinor(5000, 'JPY'),
  });
  const observability = new ConsoleObservability();
  const auditLog = new ConsoleAuditLog();
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
    integrationEventPublisher,
    integrationEventSubscriber,
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
