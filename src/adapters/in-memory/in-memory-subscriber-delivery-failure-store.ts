import type {
  SubscriberDeliveryFailureStorePort,
  SubscriberFailureInput,
  SubscriberFailureRecord,
  SubscriberFailureUpdate,
} from '../../application/ports/subscriber-delivery-failure-store-port.js';

export class InMemorySubscriberDeliveryFailureStore implements SubscriberDeliveryFailureStorePort {
  readonly records: SubscriberFailureRecord[] = [];

  async recordFailure(input: SubscriberFailureInput): Promise<SubscriberFailureRecord> {
    const record: SubscriberFailureRecord = {
      id: `subscriber-failure-${this.records.length + 1}`,
      subscriberName: input.subscriberName,
      event: input.event,
      failedAt: input.failedAt,
      retryCount: 1,
      lastError: input.errorMessage,
      nextAttemptAt: input.nextAttemptAt,
      deadLetteredAt: input.deadLetteredAt,
      resolvedAt: null,
    };

    this.records.push(record);
    return record;
  }

  async listReplayable(batchSize?: number, now?: string): Promise<SubscriberFailureRecord[]> {
    const cutoff = now ?? new Date().toISOString();
    const replayable = this.records.filter((record) => (
      record.resolvedAt == null
      && record.deadLetteredAt == null
      && record.nextAttemptAt != null
      && record.nextAttemptAt <= cutoff
    ));

    return batchSize == null ? replayable : replayable.slice(0, batchSize);
  }

  async listDeadLetters(batchSize?: number): Promise<SubscriberFailureRecord[]> {
    const deadLetters = this.records.filter((record) => record.deadLetteredAt != null);
    return batchSize == null ? deadLetters : deadLetters.slice(0, batchSize);
  }

  async markResolved(id: string, resolvedAt: string): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record) return;

    record.resolvedAt = resolvedAt;
    record.nextAttemptAt = null;
  }

  async markRetried(id: string, update: SubscriberFailureUpdate): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record) return;

    record.retryCount += 1;
    record.lastError = update.errorMessage;
    record.nextAttemptAt = update.nextAttemptAt;
    record.deadLetteredAt = update.deadLetteredAt;
  }
}
