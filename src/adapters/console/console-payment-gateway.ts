import type { PaymentGatewayPort, PaymentReceipt } from '../../application/ports/payment-gateway-port.js';
import type { Money } from '../../domain/money.js';

export class ConsolePaymentGateway implements PaymentGatewayPort {
  async charge(customerId: string, amount: Money, requestId?: string): Promise<PaymentReceipt> {
    const confirmationId = requestId ? `pay-${requestId}` : `pay-${customerId}-${amount.amountInMinor}`;
    console.log(`Charging ${customerId} for ${amount.amountInMinor} ${amount.currency}. Confirmation: ${confirmationId}`);

    return {
      customerId,
      amount: amount.toJSON(),
      confirmationId,
    };
  }
}
