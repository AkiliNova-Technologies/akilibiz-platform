import { invoke } from "@tauri-apps/api/core";

export type PurchaseOrderStatus =
  | "Draft"
  | "Pending"
  | "Partially Received"
  | "Received"
  | "Cancelled";

export interface PurchaseOrderQuery {
  skip?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  status?: PurchaseOrderStatus | "all";
}

export interface CreatePurchaseOrderPayload {
  po_number: string;
  supplier_id: number;
  items_count: number;
  total_amount: number;
  order_date: string;
  expected_delivery?: string | null;
  status?: PurchaseOrderStatus;
  notes?: string | null;
}

export interface PurchaseOrderLineInput {
  product_id: number;
  quantity_milli: number;
  unit_price_ugx: number;
}

export interface GoodsReceiptLineInput {
  product_id: number;
  purchase_order_line_id?: number | null;
  quantity_milli: number;
  unit_cost_ugx: number;
}

export interface CreateGoodsReceiptPayload {
  receipt_number: string;
  supplier_id: number;
  purchase_order_id?: number | null;
  receipt_date: string;
  supplier_reference?: string | null;
  due_date?: string | null;
  idempotency_key?: string | null;
  lines: GoodsReceiptLineInput[];
}

export interface VoidGoodsReceiptPayload {
  reason: string;
}

export interface GoodsReceiptResponse {
  id: number;
  receipt_number: string;
  supplier_id: number;
  purchase_order_id?: number | null;
  status: string;
  total_amount_ugx: number;
  payable_id: number;
}

export interface UpdatePurchaseOrderPayload {
  po_number?: string;
  supplier_id?: number;
  items_count?: number;
  total_amount?: number;
  order_date?: string;
  expected_delivery?: string | null;
  status?: PurchaseOrderStatus;
  notes?: string | null;
}

export interface PurchaseOrderResponse {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  items_count: number;
  total_amount: number;
  order_date: string;
  expected_delivery?: string | null;
  status: PurchaseOrderStatus;
  created_by_name: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderSummary {
  total_orders: number;
  pending_orders: number;
  received_orders: number;
  total_order_value: number;
}

function normalizeQuery(query: PurchaseOrderQuery = {}): PurchaseOrderQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    supplier_id: query.supplier_id,
    status: query.status && query.status !== "all" ? query.status : undefined,
  };
}

export const tauriPurchaseOrdersService = {
  async createGoodsReceipt(
    payload: CreateGoodsReceiptPayload,
  ): Promise<GoodsReceiptResponse> {
    return await invoke<GoodsReceiptResponse>("create_goods_receipt", { payload });
  },

  async voidGoodsReceipt(
    receiptId: number,
    payload: VoidGoodsReceiptPayload,
  ): Promise<GoodsReceiptResponse> {
    return await invoke<GoodsReceiptResponse>("void_goods_receipt", {
      receiptId,
      payload,
    });
  },

  async getPurchaseOrders(
    query: PurchaseOrderQuery = {},
  ): Promise<PurchaseOrderResponse[]> {
    return await invoke<PurchaseOrderResponse[]>("get_purchase_orders", {
      params: normalizeQuery(query),
    });
  },

  async getPurchaseOrder(orderId: number): Promise<PurchaseOrderResponse> {
    return await invoke<PurchaseOrderResponse>("get_purchase_order", {
      orderId,
    });
  },

  async createPurchaseOrder(
    payload: CreatePurchaseOrderPayload,
  ): Promise<PurchaseOrderResponse> {
    return await invoke<PurchaseOrderResponse>("create_purchase_order", {
      payload,
    });
  },

  async updatePurchaseOrder(
    orderId: number,
    payload: UpdatePurchaseOrderPayload,
  ): Promise<PurchaseOrderResponse> {
    return await invoke<PurchaseOrderResponse>("update_purchase_order", {
      orderId,
      payload,
    });
  },

  async markPurchaseOrderReceived(
    orderId: number,
  ): Promise<PurchaseOrderResponse> {
    return await invoke<PurchaseOrderResponse>("mark_purchase_order_received", {
      orderId,
    });
  },

  async getPurchaseOrderSummary(): Promise<PurchaseOrderSummary> {
    return await invoke<PurchaseOrderSummary>("get_purchase_order_summary");
  },
};
