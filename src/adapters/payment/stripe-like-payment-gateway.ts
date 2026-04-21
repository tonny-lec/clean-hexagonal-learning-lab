import { randomUUID } from 'node:crypto';
import type { PaymentGatewayPort, PaymentReceipt } from '../../application/ports/payment-gateway-port.js';
import type { Money } from '../../domain/money.js';

export class StripeLikePaymentGateway implements PaymentGatewayPort {
  async charge(customerId: string, amount: Money, requestId?: string): Promise<PaymentReceipt> {
    const suffix = requestId?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18) ?? randomUUID().replace(/-/g, '').slice(0, 18);

    return {
      customerId,
      amount: amount.toJSON(),
      confirmationId: `pi_${suffix}`,
    };
  }
}
