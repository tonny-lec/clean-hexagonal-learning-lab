export type BrokerPublishMessage = {
  subject: string;
  headers: Record<string, string>;
  payload: string;
};

export interface BrokerClient {
  publish(message: BrokerPublishMessage): Promise<void> | void;
  close(): Promise<void> | void;
}
