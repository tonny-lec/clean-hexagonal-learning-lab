import type { Money } from '../../domain/money.js';

export type PaymentReceipt = {
  customerId: string;
  amount: {
    amountInMinor: number;
    currency: string;
  };
  confirmationId: string;
};

export interface PaymentGatewayPort {
  charge(customerId: string, amount: Money, requestId?: string): Promise<PaymentReceipt> | PaymentReceipt;
}
