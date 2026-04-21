import type { DeliveryTrigger, DeliveryTriggerConsumer, EnqueueDeliveryTriggerInput } from '../worker/delivery-trigger-consumer.js';

export class InMemoryDeliveryTriggerConsumer implements DeliveryTriggerConsumer {
  readonly pendingTriggers: DeliveryTrigger[] = [];
  readonly acknowledgedTriggerIds: string[] = [];
  readonly releasedTriggers: Array<{ triggerId: string; reason: string }> = [];

  private readonly inFlight = new Map<string, DeliveryTrigger>();

  enqueue(input: EnqueueDeliveryTriggerInput): DeliveryTrigger {
    const trigger: DeliveryTrigger = {
      id: input.id ?? `delivery-trigger-${this.pendingTriggers.length + this.inFlight.size + 1}`,
      kind: input.kind,
      requestedAt: input.requestedAt,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.traceId ? { traceId: input.traceId } : {}),
      command: input.command ?? {},
      attempts: 0,
      lastError: null,
    };

    this.pendingTriggers.push(trigger);
    return trigger;
  }

  async reserveNext(): Promise<DeliveryTrigger | null> {
    const trigger = this.pendingTriggers.shift() ?? null;
    if (trigger) {
      this.inFlight.set(trigger.id, trigger);
    }
    return trigger;
  }

  async acknowledge(triggerId: string): Promise<void> {
    this.inFlight.delete(triggerId);
    this.acknowledgedTriggerIds.push(triggerId);
  }

  async release(triggerId: string, reason: string): Promise<void> {
    const trigger = this.inFlight.get(triggerId);
    if (!trigger) {
      return;
    }

    this.inFlight.delete(triggerId);
    trigger.attempts += 1;
    trigger.lastError = reason;
    this.releasedTriggers.push({ triggerId, reason });
    this.pendingTriggers.push(trigger);
  }
}
