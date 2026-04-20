import type { PlaceOrderCommand } from '../../application/use-cases/place-order.js';
import type { OrderSummaryDto, PlaceOrderResultDto } from '../../application/dto/order-dto.js';
import { presentOrderSummaryForCli, presentPlaceOrderResultForCli } from '../presenters/order-presenter.js';

export async function runPlaceOrderCli(
  command: PlaceOrderCommand,
  execute: (command: PlaceOrderCommand) => Promise<PlaceOrderResultDto>,
): Promise<string> {
  const result = await execute(command);
  return presentPlaceOrderResultForCli(result);
}

export async function runGetOrderCli(
  orderId: string,
  execute: (query: { orderId: string }) => Promise<OrderSummaryDto>,
): Promise<string> {
  const result = await execute({ orderId });
  return presentOrderSummaryForCli(result);
}
