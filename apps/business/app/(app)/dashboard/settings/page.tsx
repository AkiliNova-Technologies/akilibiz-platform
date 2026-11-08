"use client";

import { useEffect, useMemo } from "react";
import {
  AlertCircle,
  Building2,
  Database,
  LoaderCircle,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { ProductPageHeader } from "@/components/akilibiz/product-page-header";
import {
  type SettingsOverviewItem,
  useSettingsOverviewData,
} from "@/components/akilibiz/settings/settings-overview-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SettingsRow = SettingsOverviewItem & TableData;

function statusVariant(status: SettingsOverviewItem["status"]) {
  if (status === "Configured") return "default";
  if (status === "Needs Review") return "secondary";
  return "destructive";
}

export default function SettingsOverviewPage() {
  const { error, loadSettings, loading, settings, summary } =
    useSettingsOverviewData();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const rows = useMemo<SettingsRow[]>(
    () => settings.map((setting) => ({ ...setting })),
    [settings],
  );
  const fields: TableField<SettingsRow>[] = [
    {
      key: "label",
      header: "Setting",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "category",
      header: "Category",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    { key: "summary", header: "Summary" },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => {
        const status = value as SettingsOverviewItem["status"];
        return <Badge variant={statusVariant(status)}>{status}</Badge>;
      },
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      align: "center",
      enableSorting: true,
      cell: (value) =>
        value
          ? new Intl.DateTimeFormat("en-UG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(String(value)))
          : "Not yet updated",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 pb-6">
      <ProductPageHeader
        description="Review business configuration, receipts, taxes, and backup readiness across AkiliBiz."
        title="Settings Overview"
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-destructive">
            <span className="flex items-center gap-2">
              <AlertCircle aria-hidden="true" className="size-4" />
              {error}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadSettings()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Configured"
          value={String(summary.configured)}
          description="Settings fully configured"
          icon={<ShieldCheck className="size-5" />}
        />
        <MetricCard
          title="Needs Review"
          value={String(summary.needsReview)}
          description="Settings that should be checked"
          icon={<Settings2 className="size-5" />}
        />
        <MetricCard
          title="Not Set"
          value={String(summary.notSet)}
          description="Settings still missing"
          icon={<Database className="size-5" />}
        />
        <MetricCard
          title="Categories"
          value={String(summary.categories)}
          description="Core configuration areas"
          icon={<Building2 className="size-5" />}
        />
      </section>

      <Card>
        <CardContent>
          <DataTable<SettingsRow>
            title="Settings Register"
            description="Overview of system configuration areas and readiness"
            data={rows}
            fields={fields}
            toolbarActions={
              <Button
                variant="outline"
                onClick={() => void loadSettings()}
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : null}
                Refresh
              </Button>
            }
            enableGlobalSearch
            enableSelection={false}
            enableSorting={false}
            searchPlaceholder="Search settings..."
            pageSize={10}
            loading={loading}
            emptyMessage={
              loading ? "Loading settings..." : "No settings found."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
