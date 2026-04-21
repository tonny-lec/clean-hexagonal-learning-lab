import type {
  SubscriberFailurePolicy,
  SubscriberFailurePolicyPort,
} from '../../application/ports/subscriber-failure-policy-port.js';

export class StaticSubscriberFailurePolicy implements SubscriberFailurePolicyPort {
  constructor(
    private readonly policies: Record<string, SubscriberFailurePolicy>,
    private readonly defaultPolicy: SubscriberFailurePolicy = { maxAttempts: 3, retryDelaySeconds: 60 },
  ) {}

  getPolicy(subscriberName: string): SubscriberFailurePolicy {
    return this.policies[subscriberName] ?? this.defaultPolicy;
  }
}
