import type { OrderRepositoryPort } from '../../application/ports/order-repository-port.js';
import type { Order } from '../../domain/order.js';

export class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  findById(id: string): Order | undefined {
    return this.orders.get(id);
  }
}
