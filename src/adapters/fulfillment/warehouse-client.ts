export type WarehouseDispatchRequest = {
  dispatchRequestNumber: string;
  salesOrderNumber: string;
  buyerReference: string;
  paymentReference: string;
  items: Array<{
    stockKeepingUnit: string;
    units: number;
    priceInMinor: number;
    currencyCode: string;
  }>;
};

export type WarehouseDispatchResponse = {
  dispatchTicketNumber: string;
  warehouseReference: string;
};

export interface WarehouseClient {
  createDispatchTicket(
    request: WarehouseDispatchRequest,
  ): Promise<WarehouseDispatchResponse> | WarehouseDispatchResponse;
}
