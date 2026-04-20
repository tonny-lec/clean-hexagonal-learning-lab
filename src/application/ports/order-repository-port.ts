import type { Order } from '../../domain/order.js';

export interface OrderRepositoryPort {
  save(order: Order): Promise<void>;
  findById(id: string): Order | undefined;
}
