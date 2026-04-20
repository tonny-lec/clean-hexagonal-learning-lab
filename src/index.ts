import { runPlaceOrderBatch } from './adapters/batch/place-order-batch.js';
import { runGetOrderCli, runPlaceOrderCli } from './adapters/cli/order-cli.js';
import { startDemoHttpServer } from './adapters/http/create-demo-http-server.js';
import { createDemoDependencies } from './composition-root.js';
import { getOrderSummary } from './application/use-cases/get-order-summary.js';
import { placeOrder } from './application/use-cases/place-order.js';

const dependencies = createDemoDependencies();
const mode = process.argv[2] ?? 'cli';

if (mode === 'http') {
  console.log(await startDemoHttpServer(dependencies));
} else if (mode === 'batch') {
  const results = await runPlaceOrderBatch(
    [
      { customerId: 'batch-customer-1', items: [{ sku: 'BOOK', quantity: 1 }], idempotencyKey: 'batch-1' },
      { customerId: 'batch-customer-2', items: [{ sku: 'PEN', quantity: 3 }], idempotencyKey: 'batch-2' },
    ],
    (command) => placeOrder(command, dependencies),
  );

  console.log(JSON.stringify(results, null, 2));
} else if (mode === 'query') {
  const placed = await placeOrder(
    {
      customerId: 'query-demo',
      items: [{ sku: 'BOOK', quantity: 2 }],
      idempotencyKey: 'query-demo-key',
    },
    dependencies,
  );
  console.log(`Created ${placed.orderId}`);
  console.log(
    await runGetOrderCli(placed.orderId, (query) =>
      getOrderSummary(query, { orderRepository: dependencies.orderRepository }),
    ),
  );
} else {
  console.log(
    await runPlaceOrderCli(
      {
        customerId: 'customer-demo',
        items: [
          { sku: 'BOOK', quantity: 2 },
          { sku: 'PEN', quantity: 1 },
        ],
        idempotencyKey: 'cli-demo-key',
      },
      (command) => placeOrder(command, dependencies),
    ),
  );
}
