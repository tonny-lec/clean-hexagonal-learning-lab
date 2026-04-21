import {
  AuthenticationRequiredApplicationError,
  AuthorizationApplicationError,
} from '../errors/application-error.js';
import type { ActorDto } from '../dto/actor-dto.js';
import { Money } from '../../domain/money.js';
import type { Order } from '../../domain/order.js';

export type OrderAuthorizationPolicyDependencies = {
  highValueThreshold: Money;
};

export class OrderAuthorizationPolicy {
  constructor(private readonly dependencies: OrderAuthorizationPolicyDependencies) {}

  assertCanPlaceOrder(params: { actor?: ActorDto; customerId: string; totalAmount: Money }): void {
    const actor = this.requireActor(params.actor);

    if (actor.role === 'admin') {
      return;
    }

    if (actor.role === 'customer' && actor.customerId !== params.customerId) {
      throw new AuthorizationApplicationError('Customers can place orders only for themselves.');
    }

    if (params.totalAmount.isGreaterThan(this.dependencies.highValueThreshold)) {
      throw new AuthorizationApplicationError('High-value orders require a privileged actor.');
    }
  }

  assertCanViewOrder(actor: ActorDto | undefined, order: Order): void {
    const currentActor = this.requireActor(actor);

    if (currentActor.role === 'admin') {
      return;
    }

    if (currentActor.role === 'customer' && currentActor.customerId === order.customerId) {
      return;
    }

    throw new AuthorizationApplicationError('The current actor is not allowed to view this order.');
  }

  private requireActor(actor: ActorDto | undefined): ActorDto {
    if (!actor) {
      throw new AuthenticationRequiredApplicationError('Authenticated actor information is required.');
    }

    return actor;
  }
}
