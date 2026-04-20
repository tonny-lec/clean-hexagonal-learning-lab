import { Order } from '../../domain/order.js';
import type { OrderRepositoryPort } from '../ports/order-repository-port.js';
import type { PaymentGatewayPort } from '../ports/payment-gateway-port.js';
import type { ProductCatalogPort } from '../ports/product-catalog-port.js';

export type PlaceOrderCommand = {
  customerId: string;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
};

export type PlaceOrderDependencies = {
  catalog: ProductCatalogPort;
  orderRepository: OrderRepositoryPort;
  paymentGateway: PaymentGatewayPort;
  idGenerator: () => string;
};

export async function placeOrder(
  command: PlaceOrderCommand,
  dependencies: PlaceOrderDependencies,
): Promise<{
  orderId: string;
  totalAmount: number;
  paymentConfirmationId: string;
}> {
  const lines = command.items.map((item) => ({
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: dependencies.catalog.getUnitPrice(item.sku),
  }));

  const order = new Order(dependencies.idGenerator(), command.customerId, lines);
  const totalAmount = order.totalAmount();
  const payment = await dependencies.paymentGateway.charge(order.customerId, totalAmount);

  await dependencies.orderRepository.save(order);

  return {
    orderId: order.id,
    totalAmount,
    paymentConfirmationId: payment.confirmationId,
  };
}
