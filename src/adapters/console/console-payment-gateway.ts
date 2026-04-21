import type { PaymentGatewayPort, PaymentReceipt, RefundReceipt } from '../../application/ports/payment-gateway-port.js';
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

  async refund(paymentConfirmationId: string, amount: Money, requestId?: string): Promise<RefundReceipt> {
    const refundConfirmationId = requestId ? `refund-${requestId}` : `refund-${paymentConfirmationId}`;
    console.log(
      `Refunding ${amount.amountInMinor} ${amount.currency} for ${paymentConfirmationId}. Confirmation: ${refundConfirmationId}`,
    );

    return {
      paymentConfirmationId,
      amount: amount.toJSON(),
      refundConfirmationId,
    };
  }
}
