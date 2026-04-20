import type { PlaceOrderCommand } from '../../application/use-cases/place-order.js';
import type { PlaceOrderResultDto } from '../../application/dto/order-dto.js';

export async function runPlaceOrderBatch(
  commands: PlaceOrderCommand[],
  execute: (command: PlaceOrderCommand) => Promise<PlaceOrderResultDto>,
): Promise<PlaceOrderResultDto[]> {
  const results: PlaceOrderResultDto[] = [];

  for (const command of commands) {
    results.push(await execute(command));
  }

  return results;
}
