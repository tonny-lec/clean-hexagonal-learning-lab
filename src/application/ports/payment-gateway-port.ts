export interface PaymentGatewayPort {
  charge(customerId: string, amount: number): Promise<{
    customerId: string;
    amount: number;
    confirmationId: string;
  }> | {
    customerId: string;
    amount: number;
    confirmationId: string;
  };
}
