import * as React from "react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconCheck,
  IconClipboardList,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconTruck,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxPurchaseOrders } from "@/hooks/useReduxPurchaseOrders";
import { useReduxSuppliers } from "@/hooks/useReduxSuppliers";
import type {
  CreateGoodsReceiptPayload,
  CreatePurchaseOrderPayload,
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  UpdatePurchaseOrderPayload,
} from "@/services/tauri/purchase-orders";
import { tauriPurchaseOrdersService } from "@/services/tauri/purchase-orders";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseOrderRow extends TableData {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  items_count: number;
  total_amount: number;
  order_date: string;
  expected_delivery: string;
  status: PurchaseOrderStatus;
  created_by: string;
  notes?: string;
}

interface PurchaseOrderFormData {
  po_number: string;
  supplier_id: string;
  items_count: string;
  total_amount: string;
  order_date: string;
  expected_delivery: string;
  status: PurchaseOrderStatus;
  notes: string;
}

interface GoodsReceiptFormData {
  receipt_number: string;
  receipt_date: string;
  supplier_reference: string;
  due_date: string;
  product_id: string;
  purchase_order_line_id: string;
  quantity: string;
  unit_cost_ugx: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextWeekString() {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const year = nextWeek.getFullYear();
  const month = String(nextWeek.getMonth() + 1).padStart(2, "0");
  const day = String(nextWeek.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generatePONumber() {
  const prefix = "PO";
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${prefix}-${dateStr}-${random}`;
}

function getStatusBadge(status: PurchaseOrderStatus) {
  switch (status) {
    case "Draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "Pending":
      return <Badge variant="outline">Pending</Badge>;
    case "Partially Received":
      return <Badge variant="outline">Partially Received</Badge>;
    case "Received":
      return <Badge variant="outline">Received</Badge>;
    case "Cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
  }
}

function mapOrderRow(order: PurchaseOrderResponse): PurchaseOrderRow {
  return {
    id: order.id,
    po_number: order.po_number,
    supplier_id: order.supplier_id,
    supplier_name: order.supplier_name,
    items_count: order.items_count,
    total_amount: order.total_amount,
    order_date: order.order_date,
    expected_delivery: order.expected_delivery || "",
    status: order.status,
    created_by: order.created_by_name,
    notes: order.notes || "",
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupplierPurchaseOrdersPage() {
  const {
    orders,
    selectedOrder,
    summary,
    loading,
    getOrders,
    getOrder,
    addOrder,
    editOrder,
    markReceived,
    getSummary,
    clearOrder,
  } = useReduxPurchaseOrders();

  const { suppliers, getSuppliers } = useReduxSuppliers();

  const [viewOpen, setViewOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [receiptOrder, setReceiptOrder] = React.useState<PurchaseOrderRow | null>(null);
  const [receiptSubmitting, setReceiptSubmitting] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [editingOrderId, setEditingOrderId] = React.useState<number | null>(
    null,
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<PurchaseOrderFormData>({
    po_number: "",
    supplier_id: "",
    items_count: "",
    total_amount: "",
    order_date: getTodayString(),
    expected_delivery: getNextWeekString(),
    status: "Draft",
    notes: "",
  });
  const [receiptForm, setReceiptForm] = React.useState<GoodsReceiptFormData>({
    receipt_number: "",
    receipt_date: getTodayString(),
    supplier_reference: "",
    due_date: "",
    product_id: "",
    purchase_order_line_id: "",
    quantity: "",
    unit_cost_ugx: "",
  });

  React.useEffect(() => {
    void Promise.all([getOrders(), getSummary(), getSuppliers()]);
  }, [getOrders, getSummary, getSuppliers]);

  React.useEffect(() => {
    if (!viewOpen && !formOpen) {
      clearOrder();
    }
  }, [viewOpen, formOpen, clearOrder]);

  const purchaseOrders = React.useMemo<PurchaseOrderRow[]>(() => {
    return orders.map(mapOrderRow);
  }, [orders]);

  const totalOrders = summary?.total_orders ?? purchaseOrders.length;
  const pendingOrders =
    summary?.pending_orders ??
    purchaseOrders.filter((o) => o.status === "Pending").length;
  const receivedOrders =
    summary?.received_orders ??
    purchaseOrders.filter((o) => o.status === "Received").length;
  const totalOrderValue =
    summary?.total_order_value ??
    purchaseOrders.reduce((sum, o) => sum + o.total_amount, 0);

  const resetForm = () => {
    setFormData({
      po_number: "",
      supplier_id: "",
      items_count: "",
      total_amount: "",
      order_date: getTodayString(),
      expected_delivery: getNextWeekString(),
      status: "Draft",
      notes: "",
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.po_number.trim()) {
      newErrors.po_number = "PO Number is required";
    }
    if (!formData.supplier_id) {
      newErrors.supplier_id = "Supplier is required";
    }
    if (!formData.order_date) {
      newErrors.order_date = "Order date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof PurchaseOrderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAdd = () => {
    resetForm();
    setEditingOrderId(null);
    setIsEdit(false);
    setFormOpen(true);
  };

  const handleEdit = async (order: PurchaseOrderRow) => {
    const full = await getOrder(order.id);

    setEditingOrderId(full.id);
    setFormData({
      po_number: full.po_number,
      supplier_id: String(full.supplier_id),
      items_count: String(full.items_count),
      total_amount: String(full.total_amount),
      order_date: full.order_date,
      expected_delivery: full.expected_delivery || "",
      status: full.status,
      notes: full.notes || "",
    });
    setErrors({});
    setIsEdit(true);
    setFormOpen(true);
  };

  const handleView = async (order: PurchaseOrderRow) => {
    await getOrder(order.id);
    setViewOpen(true);
  };

  const handleMarkReceived = async (orderId: number) => {
    await markReceived(orderId);
    setViewOpen(false);
  };

  const handleReceive = (order: PurchaseOrderRow) => {
    setReceiptOrder(order);
    setReceiptForm({
      receipt_number: `GR-${Date.now()}`,
      receipt_date: getTodayString(),
      supplier_reference: "",
      due_date: "",
      product_id: "",
      purchase_order_line_id: "",
      quantity: "",
      unit_cost_ugx: "",
    });
    setReceiptOpen(true);
  };

  const handleCreateReceipt = async () => {
    if (!receiptOrder) return;
    const quantity = Number(receiptForm.quantity);
    const productId = Number(receiptForm.product_id);
    const unitCost = Number(receiptForm.unit_cost_ugx);
    const quantityMilli = quantity * 1000;
    if (
      !receiptForm.receipt_number.trim() ||
      !receiptForm.receipt_date ||
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      !Number.isSafeInteger(quantityMilli) ||
      quantityMilli <= 0 ||
      !Number.isSafeInteger(unitCost) ||
      unitCost < 0
    ) {
      toast.error("Use a valid product, a quantity to three decimal places, and a whole-UGX unit cost");
      return;
    }

    const payload: CreateGoodsReceiptPayload = {
      receipt_number: receiptForm.receipt_number.trim(),
      supplier_id: receiptOrder.supplier_id,
      purchase_order_id: receiptOrder.id,
      receipt_date: receiptForm.receipt_date,
      supplier_reference: receiptForm.supplier_reference.trim() || null,
      due_date: receiptForm.due_date || null,
      idempotency_key: `goods-receipt:${receiptForm.receipt_number.trim()}`,
      lines: [{
        product_id: productId,
        purchase_order_line_id: receiptForm.purchase_order_line_id
          ? Number(receiptForm.purchase_order_line_id)
          : null,
        quantity_milli: quantityMilli,
        unit_cost_ugx: unitCost,
      }],
    };

    setReceiptSubmitting(true);
    try {
      const receipt = await tauriPurchaseOrdersService.createGoodsReceipt(payload);
      toast.success(`Goods receipt ${receipt.receipt_number} created`);
      setReceiptOpen(false);
      await Promise.all([getOrders(), getSummary()]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setReceiptSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (isEdit && editingOrderId) {
        const payload: UpdatePurchaseOrderPayload = {
          po_number: formData.po_number.trim(),
          supplier_id: Number(formData.supplier_id),
          items_count: Number(formData.items_count || 0),
          total_amount: Number(formData.total_amount || 0),
          order_date: formData.order_date,
          expected_delivery: formData.expected_delivery || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
        };

        const updated = await editOrder(editingOrderId, payload);
        if (!updated) {
          toast.error("Failed to update purchase order");
          return;
        }
        toast.success("Purchase order updated successfully");
      } else {
        const payload: CreatePurchaseOrderPayload = {
          po_number: formData.po_number.trim(),
          supplier_id: Number(formData.supplier_id),
          items_count: Number(formData.items_count || 0),
          total_amount: Number(formData.total_amount || 0),
          order_date: formData.order_date,
          expected_delivery: formData.expected_delivery || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
        };

        const created = await addOrder(payload);
        if (!created) {
          toast.error("Failed to create purchase order");
          return;
        }
        toast.success("Purchase order created successfully");
      }

      setFormOpen(false);
      resetForm();
      setEditingOrderId(null);
      await Promise.all([getOrders(), getSummary()]);
    } catch (error: unknown) {
      console.error("Purchase order error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const orderFields: TableField<PurchaseOrderRow>[] = [
    {
      key: "po_number",
      header: "PO Number",
      enableSorting: true,
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "supplier_name",
      header: "Supplier",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "items_count",
      header: "Items",
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "total_amount",
      header: "Total Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "order_date",
      header: "Order Date",
      align: "center",
      enableSorting: true,
      cell: (value) => formatDate(String(value)),
    },
    {
      key: "expected_delivery",
      header: "Expected Delivery",
      align: "center",
      enableSorting: true,
      cell: (value) => formatDate(String(value || "")),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(value as PurchaseOrderStatus),
    },
    {
      key: "created_by",
      header: "Created By",
      align: "center",
      enableSorting: true,
    },
  ];

  const orderActions: TableAction<PurchaseOrderRow>[] = [
    {
      type: "view",
      label: "View order",
      onClick: handleView,
    },
    {
      type: "edit",
      label: "Edit order",
      onClick: handleEdit,
      disabled: (row) =>
        row.status === "Received" || row.status === "Cancelled",
    },
    {
      type: "custom",
      label: "Receive goods",
      icon: <IconPackage className="size-4" />,
      onClick: handleReceive,
      disabled: (row) => row.status === "Received" || row.status === "Cancelled",
    },
    {
      type: "custom",
      label: "Mark received",
      icon: <IconCheck className="size-4" />,
      onClick: (row) => handleMarkReceived(row.id),
      disabled: (row) =>
        row.status === "Received" || row.status === "Cancelled",
    },
  ];

  return (
    <>
      <SiteHeader label="Purchase Orders" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Purchase Orders
            </h2>
            <p className="text-sm text-muted-foreground">
              Create, monitor, and track supplier orders from draft through
              receipt.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Orders"
              value={String(totalOrders)}
              description="All recorded supplier orders"
              icon={<IconClipboardList className="size-5" />}
            />

            <MetricCard
              title="Pending Orders"
              value={String(pendingOrders)}
              description="Orders awaiting fulfilment"
              icon={<IconTruck className="size-5" />}
            />

            <MetricCard
              title="Received Orders"
              value={String(receivedOrders)}
              description="Orders fully delivered"
              icon={<IconPackage className="size-5" />}
            />

            <MetricCard
              title="Order Value"
              value={formatCurrency(totalOrderValue)}
              description="Total value committed in supplier orders"
              icon={<IconWallet className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<PurchaseOrderRow>
                title="Purchase Order Register"
                description="Track supplier orders, order value, and fulfilment status"
                data={purchaseOrders}
                fields={orderFields}
                actions={orderActions}
                enableGlobalSearch
                searchPlaceholder="Search by PO number, supplier, or user..."
                pageSize={10}
                onRowClick={handleView}
                emptyMessage={
                  loading
                    ? "Loading purchase orders..."
                    : "No purchase orders found."
                }
                toolbarActions={
                  <Button onClick={handleAdd}>
                    <IconPlus className="mr-2 size-4" />
                    New Purchase Order
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Purchase Order" : "Create Purchase Order"}
            </DialogTitle>
            <DialogDescription>
              Capture purchase order details for supplier procurement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="po_number">PO Number</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="po_number"
                    required
                    value={formData.po_number}
                    onChange={(e) => handleFieldChange("po_number", e.target.value)}
                    placeholder="Enter PO number"
                    className={`flex-1 ${errors.po_number ? "border-red-500" : ""}`}
                  />
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleFieldChange("po_number", generatePONumber())}
                      title="Generate PO number"
                      className="h-11"
                    >
                      <IconRefresh className="size-4" />
                    </Button>
                  )}
                </div>
                {errors.po_number && (
                  <p className="text-sm text-red-500">{errors.po_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel required>Supplier</FieldLabel>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => handleFieldChange("supplier_id", value)}
                >
                  <SelectTrigger aria-required="true" className={`w-full ${errors.supplier_id ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplier_id && (
                  <p className="text-sm text-red-500">{errors.supplier_id}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="items_count">Items Count</Label>
                <Input
                  id="items_count"
                  type="number"
                  value={formData.items_count}
                  onChange={(e) => handleFieldChange("items_count", e.target.value)}
                  placeholder="Enter item count"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input
                  id="total_amount"
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => handleFieldChange("total_amount", e.target.value)}
                  placeholder="Enter total amount"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="order_date">Order Date</FieldLabel>
                <Input
                  id="order_date"
                  required
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => handleFieldChange("order_date", e.target.value)}
                  className={errors.order_date ? "border-red-500" : ""}
                />
                {errors.order_date && (
                  <p className="text-sm text-red-500">{errors.order_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_delivery">Expected Delivery</Label>
                <Input
                  id="expected_delivery"
                  type="date"
                  value={formData.expected_delivery}
                  onChange={(e) => handleFieldChange("expected_delivery", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: PurchaseOrderStatus) =>
                  handleFieldChange("status", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partially Received">
                    Partially Received
                  </SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Optional notes for this order"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {isEdit ? "Update Order" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Goods Receipt</DialogTitle>
            <DialogDescription>
              Record one received line for {receiptOrder?.po_number}. Quantities are entered in normal units.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2"><FieldLabel required>Receipt Number</FieldLabel><Input required value={receiptForm.receipt_number} onChange={(e) => setReceiptForm((p) => ({ ...p, receipt_number: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Receipt Date</FieldLabel><Input required type="date" value={receiptForm.receipt_date} onChange={(e) => setReceiptForm((p) => ({ ...p, receipt_date: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Product ID</FieldLabel><Input required type="number" min="1" value={receiptForm.product_id} onChange={(e) => setReceiptForm((p) => ({ ...p, product_id: e.target.value }))} /></div>
            <div className="space-y-2"><Label>PO Line ID (optional)</Label><Input type="number" min="1" value={receiptForm.purchase_order_line_id} onChange={(e) => setReceiptForm((p) => ({ ...p, purchase_order_line_id: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Quantity</FieldLabel><Input required type="number" min="0.001" step="0.001" value={receiptForm.quantity} onChange={(e) => setReceiptForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Unit Cost (UGX)</FieldLabel><Input required type="number" min="0" step="1" value={receiptForm.unit_cost_ugx} onChange={(e) => setReceiptForm((p) => ({ ...p, unit_cost_ugx: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Supplier Reference</Label><Input value={receiptForm.supplier_reference} onChange={(e) => setReceiptForm((p) => ({ ...p, supplier_reference: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={receiptForm.due_date} onChange={(e) => setReceiptForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)} disabled={receiptSubmitting}>Cancel</Button>
            <Button onClick={handleCreateReceipt} disabled={receiptSubmitting}>{receiptSubmitting ? "Creating..." : "Create Receipt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              Review supplier order information and fulfilment status.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      PO Number
                    </span>
                    <span className="font-mono">{selectedOrder.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Supplier
                    </span>
                    <span className="font-medium">
                      {selectedOrder.supplier_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <span className="font-medium">
                      {selectedOrder.items_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Amount
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Order Date
                    </span>
                    <span className="font-medium">
                      {formatDate(selectedOrder.order_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Expected Delivery
                    </span>
                    <span className="font-medium">
                      {formatDate(selectedOrder.expected_delivery)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created By
                    </span>
                    <span className="font-medium">
                      {selectedOrder.created_by_name}
                    </span>
                  </div>

                  {selectedOrder.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">
                          Notes
                        </p>
                        <p className="text-sm">{selectedOrder.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                {selectedOrder.status !== "Received" &&
                  selectedOrder.status !== "Cancelled" && (
                    <Button
                      className="flex-1"
                      onClick={() => handleMarkReceived(selectedOrder.id)}
                    >
                      <IconCheck className="mr-2 size-4" />
                      Mark Received
                    </Button>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
