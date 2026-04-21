import type { FulfillmentPort, FulfillmentReceipt } from '../../application/ports/fulfillment-port.js';

export class FailingFulfillmentService implements FulfillmentPort {
  constructor(private readonly message = 'Fulfillment service failure') {}

  async request(): Promise<FulfillmentReceipt> {
    throw new Error(this.message);
  }
}
