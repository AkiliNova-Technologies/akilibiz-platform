import {
  DataTable,
  type TableField,
  type TableData,
} from "@/components/data-table";
import MetricCard from "@/components/metric-card";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconBuildingStore,
  IconDeviceFloppy,
  IconSettings,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useReduxSettings } from "@/hooks/useReduxSettings";
import type {
  BackupRecord,
  BusinessProfile,
  ReceiptSettings,
  TaxConfig,
} from "@/services/tauri/settings";
import { useEffect, useMemo } from "react";


// ============================================================================
// TYPES
// ============================================================================

type SettingStatus = "Configured" | "Needs Review" | "Not Set";

interface SettingsRow extends TableData {
  id: number;
  setting_name: string;
  category: "Business" | "Receipt" | "Tax" | "Backup";
  summary: string;
  status: SettingStatus;
  updated_at: string;
}


function getBusinessStatus(profile: BusinessProfile | null): SettingStatus {
  if (!profile) return "Not Set";

  const strong =
    profile.business_name?.trim() &&
    profile.currency?.trim() &&
    profile.timezone?.trim() &&
    (profile.email?.trim() || profile.phone?.trim());

  const partial =
    profile.business_name?.trim() ||
    profile.email?.trim() ||
    profile.phone?.trim();

  if (strong) return "Configured";
  if (partial) return "Needs Review";
  return "Not Set";
}

function getReceiptStatus(receipt: ReceiptSettings | null): SettingStatus {
  if (!receipt) return "Not Set";

  const strong =
    receipt.receipt_width?.trim() &&
    Number(receipt.copies_per_print) >= 1;

  const partial =
    receipt.receipt_width?.trim();

  if (strong) return "Configured";
  if (partial) return "Needs Review";
  return "Not Set";
}

function getTaxStatus(tax: TaxConfig | null): SettingStatus {
  if (!tax) return "Not Set";

  const strong =
    tax.default_tax_name?.trim() &&
    tax.tax_rounding_mode?.trim() &&
    tax.default_tax_rate >= 0;

  const partial =
    tax.default_tax_name?.trim() ||
    tax.tax_number?.trim();

  if (strong) return "Configured";
  if (partial) return "Needs Review";
  return "Not Set";
}

function getBackupStatus(backups: BackupRecord[]): SettingStatus {
  if (!backups?.length) return "Not Set";
  if (backups.some((b) => b.status === "ready")) return "Configured";
  return "Needs Review";
}

// ============================================================================
// MOCK DATA
// ============================================================================



// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsOverviewPage() {

  const {
  businessProfile,
  receiptSettings,
  taxConfig,
  backupRecords,
  getBusinessProfile,
  getReceiptSettings,
  getTaxConfig,
  getBackupRecords,
} = useReduxSettings();

useEffect(() => {
  getBusinessProfile();
  getReceiptSettings();
  getTaxConfig();
  getBackupRecords();
}, [getBusinessProfile, getReceiptSettings, getTaxConfig, getBackupRecords]);

const settingsData: SettingsRow[] = useMemo(() => {
  return [
    {
      id: 1,
      setting_name: "Business Profile",
      category: "Business",
      summary: businessProfile?.business_name
        ? `Business name: ${businessProfile.business_name}`
        : "Business identity and contact details not fully configured",
      status: getBusinessStatus(businessProfile),
      updated_at: businessProfile?.updated_at || new Date().toISOString(),
    },
    {
      id: 2,
      setting_name: "Receipt Settings",
      category: "Receipt",
      summary: receiptSettings?.business_header
        ? `Header: ${receiptSettings.business_header}`
        : "Uses Business Profile header",
      status: getReceiptStatus(receiptSettings),
      updated_at: receiptSettings?.updated_at || new Date().toISOString(),
    },
    {
      id: 3,
      setting_name: "Tax Configuration",
      category: "Tax",
      summary: taxConfig?.default_tax_name
        ? `${taxConfig.default_tax_name} at ${taxConfig.default_tax_rate}%`
        : "Tax rules are not fully configured",
      status: getTaxStatus(taxConfig),
      updated_at: taxConfig?.updated_at || new Date().toISOString(),
    },
    {
      id: 4,
      setting_name: "Backup & Restore",
      category: "Backup",
      summary: backupRecords?.length
        ? `${backupRecords.length} backup record(s) available`
        : "No backups created yet",
      status: getBackupStatus(backupRecords),
      updated_at:
        backupRecords?.[0]?.backup_date || new Date().toISOString(),
    },
  ];
}, [businessProfile, receiptSettings, taxConfig, backupRecords]);

  const configuredCount = settingsData.filter((s) => s.status === "Configured").length;
  const needsReviewCount = settingsData.filter((s) => s.status === "Needs Review").length;
  const notSetCount = settingsData.filter((s) => s.status === "Not Set").length;
  const categoriesCount = new Set(settingsData.map((s) => s.category)).size;

  const fields: TableField<SettingsRow>[] = [
    {
      key: "setting_name",
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
    {
      key: "summary",
      header: "Summary",
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) =>
        value === "Configured" ? (
          <Badge variant="outline">Configured</Badge>
        ) : value === "Needs Review" ? (
          <Badge variant="secondary">Needs Review</Badge>
        ) : (
          <Badge variant="destructive">Not Set</Badge>
        ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      align: "center",
      enableSorting: true,
      cell: (value) =>
        new Date(String(value)).toLocaleDateString("en-UG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
  ];

  return (
    <>
      <SiteHeader label="Settings Overview" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Settings Overview</h2>
            <p className="text-sm text-muted-foreground">
              Review business configuration, receipts, taxes, and backup readiness across AkiliBiz.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Configured"
              value={String(configuredCount)}
              description="Settings fully configured"
              icon={<IconShieldCheck className="size-5" />}
            />

            <MetricCard
              title="Needs Review"
              value={String(needsReviewCount)}
              description="Settings that should be checked"
              icon={<IconSettings className="size-5" />}
            />

            <MetricCard
              title="Not Set"
              value={String(notSetCount)}
              description="Settings still missing"
              icon={<IconDeviceFloppy className="size-5" />}
            />

            <MetricCard
              title="Categories"
              value={String(categoriesCount)}
              description="Core configuration areas"
              icon={<IconBuildingStore className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              <DataTable<SettingsRow>
                title="Settings Register"
                description="Overview of system configuration areas and readiness"
                data={settingsData}
                fields={fields}
                enableGlobalSearch
                searchPlaceholder="Search settings..."
                pageSize={10}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
