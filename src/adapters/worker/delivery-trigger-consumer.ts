import type { PollOutboxCommand } from '../../application/use-cases/poll-outbox.js';

export type DeliveryTriggerKind = 'schedule' | 'queue-message';

export type DeliveryTrigger = {
  id: string;
  kind: DeliveryTriggerKind;
  requestedAt: string;
  command: PollOutboxCommand;
  attempts: number;
  lastError: string | null;
};

export type EnqueueDeliveryTriggerInput = {
  id?: string;
  kind: DeliveryTriggerKind;
  requestedAt: string;
  command?: PollOutboxCommand;
};

export interface DeliveryTriggerConsumer {
  reserveNext(): Promise<DeliveryTrigger | null> | DeliveryTrigger | null;
  acknowledge(triggerId: string): Promise<void> | void;
  release(triggerId: string, reason: string): Promise<void> | void;
}
