import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { PlaceOrderDependencies } from '../../application/use-cases/place-order.js';
import { placeOrder } from '../../application/use-cases/place-order.js';
import { getOrderSummary } from '../../application/use-cases/get-order-summary.js';
import { handleGetOrderHttp } from './get-order-http-handler.js';
import { handlePlaceOrderHttp } from './place-order-http-handler.js';

export function createDemoHttpServer(dependencies: PlaceOrderDependencies) {
  return createServer(async (req, res) => {
    const url = req.url ?? '/';

    if (req.method === 'POST' && url === '/orders') {
      const body = await readBody(req);
      const response = await handlePlaceOrderHttp({ body }, (command) => placeOrder(command, dependencies));
      res.writeHead(response.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response.body));
      return;
    }

    if (req.method === 'GET' && url.startsWith('/orders/')) {
      const orderId = url.replace('/orders/', '');
      const response = await handleGetOrderHttp({ params: { orderId } }, (query) =>
        getOrderSummary(query, { orderRepository: dependencies.orderRepository }),
      );
      res.writeHead(response.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response.body));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'NotFound', message: 'Route not found.' }));
  });
}

export async function startDemoHttpServer(dependencies: PlaceOrderDependencies, port = 3000): Promise<string> {
  const server = createDemoHttpServer(dependencies);

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  const address = server.address() as AddressInfo;
  return `HTTP demo server listening at http://127.0.0.1:${address.port}`;
}

async function readBody(request: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}
