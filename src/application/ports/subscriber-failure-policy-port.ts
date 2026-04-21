export type SubscriberFailurePolicy = {
  maxAttempts: number;
  retryDelaySeconds: number;
};

export interface SubscriberFailurePolicyPort {
  getPolicy(subscriberName: string): SubscriberFailurePolicy;
}
