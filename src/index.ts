import { ConsolePaymentGateway } from './adapters/console/console-payment-gateway.js';
import { InMemoryOrderRepository } from './adapters/in-memory/in-memory-order-repository.js';
import { StaticProductCatalog } from './adapters/in-memory/static-product-catalog.js';
import { placeOrder } from './application/use-cases/place-order.js';

const orderRepository = new InMemoryOrderRepository();
const catalog = new StaticProductCatalog({
  BOOK: 1200,
  PEN: 250,
  BAG: 3200,
});
const paymentGateway = new ConsolePaymentGateway();

const result = await placeOrder(
  {
    customerId: 'customer-demo',
    items: [
      { sku: 'BOOK', quantity: 2 },
      { sku: 'PEN', quantity: 1 },
    ],
  },
  {
    catalog,
    orderRepository,
    paymentGateway,
    idGenerator: () => 'order-demo-1',
  },
);

console.log('Order placed:', result);
console.log('Saved order total:', orderRepository.findById('order-demo-1')?.totalAmount());
