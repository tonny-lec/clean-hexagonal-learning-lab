import type { Order } from '../../domain/order.js';
import type { TransactionContext } from './unit-of-work-port.js';

export type StoredOrderRecord = {
  order: Order;
  paymentConfirmationId?: string;
};

export interface OrderRepositoryPort {
  save(
    order: Order,
    options?: { idempotencyKey?: string; paymentConfirmationId?: string },
    transaction?: TransactionContext,
  ): Promise<void>;
  findById(id: string): Promise<Order | undefined> | Order | undefined;
  findByIdempotencyKey?(idempotencyKey: string): Promise<StoredOrderRecord | undefined> | StoredOrderRecord | undefined;
}
