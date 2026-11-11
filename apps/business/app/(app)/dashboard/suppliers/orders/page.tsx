"use client";
import { useState } from "react";
import {
  Check,
  ClipboardList,
  Package,
  Plus,
  Truck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  usePurchaseOrdersData,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/components/akilibiz/suppliers/purchase-orders-data";
import {
  useSuppliersData,
  formatSupplierCurrency,
} from "@/components/akilibiz/suppliers/suppliers-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
type Row = PurchaseOrder & TableData;
const badge = (s: PurchaseOrderStatus) => (
  <Badge
    variant={
      s === "Cancelled"
        ? "destructive"
        : s === "Draft"
          ? "secondary"
          : "outline"
    }>
    {s}
  </Badge>
);
export default function SupplierPurchaseOrdersPage() {
  const { orders, addOrder, editOrder, markReceived, loading } =
    usePurchaseOrdersData();
  const { suppliers } = useSuppliersData();
  const [form, setForm] = useState(false),
    [selected, setSelected] = useState<Row | null>(null),
    [detail, setDetail] = useState(false);
  const [data, setData] = useState({
    po_number: "",
    supplier_id: "",
    items_count: "",
    total_amount: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery: "",
    status: "Draft" as PurchaseOrderStatus,
    notes: "",
  });
  const fields: TableField<Row>[] = [
    { key: "po_number", header: "PO Number", enableSorting: true },
    { key: "supplier_name", header: "Supplier", enableSorting: true },
    {
      key: "items_count",
      header: "Items",
      align: "center",
      cell: (v) => <Badge variant="outline">{Number(v)}</Badge>,
    },
    {
      key: "total_amount",
      header: "Total Amount",
      align: "right",
      cell: (v) => formatSupplierCurrency(Number(v)),
    },
    { key: "order_date", header: "Order Date", align: "center" },
    { key: "expected_delivery", header: "Expected Delivery", align: "center" },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (v) => badge(v as PurchaseOrderStatus),
    },
    { key: "created_by_name", header: "Created By", align: "center" },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "view",
      label: "View order",
      onClick: (r) => {
        setSelected(r);
        setDetail(true);
      },
    },
    {
      type: "edit",
      label: "Edit order",
      disabled: () => true,
      onClick: (r) => {
        setSelected(r);
        setData({
          ...data,
          po_number: r.po_number,
          supplier_id: String(r.supplier_id),
          items_count: String(r.items_count),
          total_amount: String(r.total_amount),
          order_date: r.order_date,
          expected_delivery: r.expected_delivery,
          status: r.status,
          notes: r.notes ?? "",
        });
        setForm(true);
      },
    },
    {
      type: "custom",
      label: "Mark received",
      icon: <Check className="size-4" />,
      disabled: () => true,
      onClick: async (r) => {
        await markReceived(r.id);
        toast.success("Order marked received");
      },
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
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
              value="—"
              description="All recorded supplier orders"
              icon={<ClipboardList className="size-5" />}
            />
            <MetricCard
              title="Pending Orders"
              value="—"
              description="Orders awaiting fulfilment"
              icon={<Truck className="size-5" />}
            />
            <MetricCard
              title="Received Orders"
              value="—"
              description="Orders fully delivered"
              icon={<Package className="size-5" />}
            />
            <MetricCard
              title="Order Value"
              value="—"
              description="Total value committed"
              icon={<Wallet className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Purchase Order Register"
                description="Track supplier orders, order value, and fulfilment status"
                data={orders as Row[]}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search by PO number, supplier, or user..."
                pageSize={10}
                onRowClick={(r) => {
                  setSelected(r);
                  setDetail(true);
                }}
                emptyMessage={
                  loading
                    ? "Loading purchase orders..."
                     : "No purchase orders available."
                }
                toolbarActions={
                  <Button disabled title="Purchase order creation is not connected">
                    <Plus className="mr-2 size-4" />
                    New Purchase Order
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected ? "Edit Purchase Order" : "Create Purchase Order"}
            </DialogTitle>
            <DialogDescription>
              Capture supplier order details and fulfilment status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>PO Number</FieldLabel>
              <Input
                value={data.po_number}
                onChange={(e) =>
                  setData({ ...data, po_number: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel required>Supplier</FieldLabel>
              <Select
                value={data.supplier_id}
                onValueChange={(v) => setData({ ...data, supplier_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Items Count</Label>
              <Input
                type="number"
                value={data.items_count}
                onChange={(e) =>
                  setData({ ...data, items_count: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                value={data.total_amount}
                onChange={(e) =>
                  setData({ ...data, total_amount: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel required>Order Date</FieldLabel>
              <Input
                type="date"
                value={data.order_date}
                onChange={(e) =>
                  setData({ ...data, order_date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Expected Delivery</Label>
              <Input
                type="date"
                value={data.expected_delivery}
                onChange={(e) =>
                  setData({ ...data, expected_delivery: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={data.status}
                onValueChange={(v: PurchaseOrderStatus) =>
                  setData({ ...data, status: v })
                }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Draft",
                    "Pending",
                    "Partially Received",
                    "Received",
                    "Cancelled",
                  ].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Label>Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(false)}>
              Cancel
            </Button>
            <Button
              disabled
              title="Purchase-order posting is not connected"
              onClick={async () => {
                if (!data.po_number || !data.supplier_id || !data.order_date) {
                  toast.error(
                    "PO number, supplier, and order date are required",
                  );
                  return;
                }
                const supplier = suppliers.find(
                  (s) => s.id === Number(data.supplier_id),
                );
                const order = {
                  po_number: data.po_number,
                  supplier_id: Number(data.supplier_id),
                  supplier_name: supplier?.name ?? "Supplier",
                  items_count: Number(data.items_count || 0),
                  total_amount: Number(data.total_amount || 0),
                  order_date: data.order_date,
                  expected_delivery: data.expected_delivery,
                  status: data.status,
                  notes: data.notes,
                };
                if (selected) await editOrder(selected.id, order);
                else await addOrder(order);
                toast.success("Purchase order saved");
                setForm(false);
              }}>
              Save Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={detail} onOpenChange={setDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              Review supplier order information and fulfilment status.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Card>
              <CardContent className="space-y-3 p-4">
                {[
                  ["PO Number", selected.po_number],
                  ["Supplier", selected.supplier_name],
                  ["Items", selected.items_count],
                  [
                    "Total Amount",
                    formatSupplierCurrency(selected.total_amount),
                  ],
                  ["Order Date", selected.order_date],
                  ["Expected Delivery", selected.expected_delivery],
                  ["Created By", selected.created_by_name],
                  ["Notes", selected.notes || "—"],
                ].map(([l, v]) => (
                  <div className="flex justify-between" key={l}>
                    <span className="text-muted-foreground">{l}</span>
                    <span>{v}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span>Status</span>
                  {badge(selected.status)}
                </div>
                {selected.status !== "Received" &&
                  selected.status !== "Cancelled" && (
                    <Button
                      className="w-full"
                      disabled
                      title="Goods receipt posting is not connected"
                      onClick={async () => {
                        await markReceived(selected.id);
                        setDetail(false);
                        toast.success("Order marked received");
                      }}>
                      <Check className="mr-2 size-4" />
                      Mark Received
                    </Button>
                  )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
