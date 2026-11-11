"use client";

import type { TableData } from "@/components/akilibiz/data-table";
import { HostedSuppliers } from "@/components/akilibiz/contacts/hosted-suppliers";
import { HostedCustomers } from "@/components/akilibiz/contacts/hosted-customers";

export interface HostedCustomer extends TableData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  customer_type: string;
  loyalty_points: number;
  is_active: boolean;
  updated_at: string;
}

export interface HostedSupplier extends TableData {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  address: string | null;
  payment_terms: string;
  is_active: boolean;
  updated_at: string;
  products_supplied?: null;
  total_purchases?: null;
  outstanding_balance?: null;
  last_supply_date?: null;
}

export function HostedDirectory({
  view,
  customers,
  suppliers,
  error,
  canEditContacts,
}: {
  view: "customers" | "suppliers";
  businessName: string;
  customers: HostedCustomer[];
  suppliers: HostedSupplier[];
  error?: string | null;
  canEditContacts: boolean;
}) {
  return view === "customers"
    ? <HostedCustomers customers={customers} error={error} canEditContacts={canEditContacts} />
    : <HostedSuppliers suppliers={suppliers} error={error} canEditContacts={canEditContacts} />;
}
