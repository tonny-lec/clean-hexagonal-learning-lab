import type { PaymentGatewayPort } from '../../application/ports/payment-gateway-port.js';

export class ConsolePaymentGateway implements PaymentGatewayPort {
  async charge(customerId: string, amount: number): Promise<{
    customerId: string;
    amount: number;
    confirmationId: string;
  }> {
    const confirmationId = `pay-${customerId}-${amount}`;
    console.log(`Charging ${customerId} for ${amount}. Confirmation: ${confirmationId}`);

    return {
      customerId,
      amount,
      confirmationId,
    };
  }
}
