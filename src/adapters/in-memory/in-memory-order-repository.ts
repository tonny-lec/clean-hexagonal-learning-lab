import type { OrderRepositoryPort, StoredOrderRecord } from '../../application/ports/order-repository-port.js';
import type { Order } from '../../domain/order.js';

export class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly orders = new Map<string, Order>();
  private readonly ordersByIdempotencyKey = new Map<string, StoredOrderRecord>();

  async save(order: Order, options?: { idempotencyKey?: string; paymentConfirmationId?: string }): Promise<void> {
    this.orders.set(order.id, order);

    if (options?.idempotencyKey) {
      this.ordersByIdempotencyKey.set(options.idempotencyKey, {
        order,
        paymentConfirmationId: options.paymentConfirmationId,
      });
    }
  }

  async findById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<StoredOrderRecord | undefined> {
    return this.ordersByIdempotencyKey.get(idempotencyKey);
  }
}
