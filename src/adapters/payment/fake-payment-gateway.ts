import type { PaymentGatewayPort, PaymentReceipt } from '../../application/ports/payment-gateway-port.js';
import type { Money } from '../../domain/money.js';

export class FakePaymentGateway implements PaymentGatewayPort {
  async charge(customerId: string, amount: Money, requestId?: string): Promise<PaymentReceipt> {
    return {
      customerId,
      amount: amount.toJSON(),
      confirmationId: requestId ? `fake-${requestId}` : `fake-${customerId}-${amount.amountInMinor}`,
    };
  }
}
