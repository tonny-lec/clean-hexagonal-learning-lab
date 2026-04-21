import { connect, headers, StringCodec, type NatsConnection } from 'nats';
import type { BrokerClient, BrokerPublishMessage } from './broker-client.js';

export class NatsBrokerClient implements BrokerClient {
  private readonly codec = StringCodec();

  constructor(private readonly connection: NatsConnection) {}

  async publish(message: BrokerPublishMessage): Promise<void> {
    const brokerHeaders = headers();
    for (const [key, value] of Object.entries(message.headers)) {
      brokerHeaders.set(key, value);
    }

    this.connection.publish(message.subject, this.codec.encode(message.payload), {
      headers: brokerHeaders,
    });
    await this.connection.flush();
  }

  async close(): Promise<void> {
    await this.connection.drain();
  }
}

export async function createNatsBrokerClient(args: {
  servers?: string[];
  name?: string;
} = {}): Promise<BrokerClient> {
  const connection = await connect({
    servers: args.servers,
    name: args.name,
  });

  return new NatsBrokerClient(connection);
}
