import { connect, StringCodec } from 'nats';

const servers = process.env.NATS_URL ?? 'nats://127.0.0.1:4222';
const subject = process.argv[2] ?? 'events.>';
const timeoutMs = Number(process.env.NATS_SUBSCRIBE_TIMEOUT_MS ?? '15000');
const codec = StringCodec();

const connection = await connect({
  servers: [servers],
  name: 'clean-hexagonal-learning-lab-subscriber',
});

const subscription = connection.subscribe(subject, { max: 1 });
console.error(`Subscribed to ${subject}; waiting for one message...`);
const timeout = setTimeout(async () => {
  console.error(`Timed out waiting for a message on ${subject}`);
  await connection.close();
  process.exit(1);
}, timeoutMs);

for await (const message of subscription) {
  clearTimeout(timeout);
  const headers = Object.fromEntries(message.headers ? [...message.headers] : []);
  const payload = codec.decode(message.data);

  console.log(
    JSON.stringify(
      {
        subject: message.subject,
        headers,
        payload: JSON.parse(payload),
      },
      null,
      2,
    ),
  );

  break;
}

await connection.drain();
