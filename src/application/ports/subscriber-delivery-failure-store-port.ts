import type { OrderPlacedIntegrationEvent } from '../integration-events/order-integration-event.js';

export type SubscriberFailureRecord = {
  id: string;
  subscriberName: string;
  event: OrderPlacedIntegrationEvent;
  failedAt: string;
  retryCount: number;
  lastError: string;
  nextAttemptAt: string | null;
  deadLetteredAt: string | null;
  resolvedAt: string | null;
};

export type SubscriberFailureInput = {
  subscriberName: string;
  event: OrderPlacedIntegrationEvent;
  failedAt: string;
  errorMessage: string;
  nextAttemptAt: string | null;
  deadLetteredAt: string | null;
};

export type SubscriberFailureUpdate = {
  errorMessage: string;
  nextAttemptAt: string | null;
  deadLetteredAt: string | null;
};

export interface SubscriberDeliveryFailureStorePort {
  recordFailure(input: SubscriberFailureInput): Promise<SubscriberFailureRecord> | SubscriberFailureRecord;
  listReplayable(batchSize?: number, now?: string): Promise<SubscriberFailureRecord[]> | SubscriberFailureRecord[];
  listDeadLetters(batchSize?: number): Promise<SubscriberFailureRecord[]> | SubscriberFailureRecord[];
  markResolved(id: string, resolvedAt: string): Promise<void> | void;
  markRetried(id: string, update: SubscriberFailureUpdate): Promise<void> | void;
}
