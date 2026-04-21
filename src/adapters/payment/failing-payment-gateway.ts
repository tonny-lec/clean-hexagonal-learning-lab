import type { PaymentGatewayPort, PaymentReceipt } from '../../application/ports/payment-gateway-port.js';
import type { Money } from '../../domain/money.js';

export class FailingPaymentGateway implements PaymentGatewayPort {
  constructor(private readonly message = 'Payment gateway failure') {}

  async charge(_customerId: string, _amount: Money, _requestId?: string): Promise<PaymentReceipt> {
    throw new Error(this.message);
  }
}
