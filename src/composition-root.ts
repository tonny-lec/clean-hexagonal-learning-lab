import { ConsolePaymentGateway } from './adapters/console/console-payment-gateway.js';
import { InMemoryDomainEventPublisher } from './adapters/in-memory/in-memory-domain-event-publisher.js';
import { InMemoryOrderRepository } from './adapters/in-memory/in-memory-order-repository.js';
import { InMemoryOutbox } from './adapters/in-memory/in-memory-outbox.js';
import { NoopUnitOfWork } from './adapters/in-memory/noop-unit-of-work.js';
import { StaticProductCatalog } from './adapters/in-memory/static-product-catalog.js';
import { Money } from './domain/money.js';
import { OrderAuthorizationPolicy } from './application/policies/order-authorization-policy.js';

export function createDemoDependencies() {
  const orderRepository = new InMemoryOrderRepository();
  const catalog = new StaticProductCatalog({
    BOOK: 1200,
    PEN: 250,
    BAG: 3200,
  });
  const paymentGateway = new ConsolePaymentGateway();
  const eventPublisher = new InMemoryDomainEventPublisher();
  const outbox = new InMemoryOutbox();
  const unitOfWork = new NoopUnitOfWork();
  const authorizationPolicy = new OrderAuthorizationPolicy({
    highValueThreshold: Money.fromMinor(5000, 'JPY'),
  });

  return {
    catalog,
    orderRepository,
    paymentGateway,
    eventPublisher,
    outbox,
    unitOfWork,
    authorizationPolicy,
    idGenerator: () => `order-${Math.random().toString(36).slice(2, 10)}`,
  };
}
