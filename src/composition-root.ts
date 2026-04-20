import { ConsolePaymentGateway } from './adapters/console/console-payment-gateway.js';
import { InMemoryDomainEventPublisher } from './adapters/in-memory/in-memory-domain-event-publisher.js';
import { InMemoryOrderRepository } from './adapters/in-memory/in-memory-order-repository.js';
import { NoopUnitOfWork } from './adapters/in-memory/noop-unit-of-work.js';
import { StaticProductCatalog } from './adapters/in-memory/static-product-catalog.js';

export function createDemoDependencies() {
  const orderRepository = new InMemoryOrderRepository();
  const catalog = new StaticProductCatalog({
    BOOK: 1200,
    PEN: 250,
    BAG: 3200,
  });
  const paymentGateway = new ConsolePaymentGateway();
  const eventPublisher = new InMemoryDomainEventPublisher();
  const unitOfWork = new NoopUnitOfWork();

  return {
    catalog,
    orderRepository,
    paymentGateway,
    eventPublisher,
    unitOfWork,
    idGenerator: () => `order-${Math.random().toString(36).slice(2, 10)}`,
  };
}
