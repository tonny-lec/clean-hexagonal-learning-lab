import type { WarehouseClient, WarehouseDispatchRequest, WarehouseDispatchResponse } from './warehouse-client.js';

export class FakeWarehouseClient implements WarehouseClient {
  async createDispatchTicket(request: WarehouseDispatchRequest): Promise<WarehouseDispatchResponse> {
    return {
      dispatchTicketNumber: `dispatch-${request.dispatchRequestNumber}`,
      warehouseReference: `warehouse-${request.salesOrderNumber}`,
    };
  }
}
