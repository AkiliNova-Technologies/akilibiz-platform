-- Web POS sales foundation, staged only. Do not expose posting until the
-- desktop inbound reconciliation and unified sellable-stock RPC are qualified.
-- No existing desktop sync tables, balances, or users are changed.
-- These records are NOT desktop financial mirror rows.

create table private.web_pos_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  state text not null default 'pending'
    check (state in ('pending','committed','voided')),
  payment_method text not null
    check (payment_method in ('cash','mobile_money','card','credit')),
  payment_state text not null default 'pending'
    check (payment_state in ('pending','confirmed','failed','unknown','refunded')),
  currency_code text not null default 'UGX' check (currency_code='UGX'),
  subtotal_ugx bigint not null check (subtotal_ugx>=0),
  discount_ugx bigint not null default 0 check (discount_ugx>=0),
  tax_ugx bigint not null check (tax_ugx>=0),
  total_ugx bigint generated always as (subtotal_ugx-discount_ugx+tax_ugx) stored,
  tax_policy_snapshot jsonb not null check (jsonb_typeof(tax_policy_snapshot)='object'),
  receipt_number text,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (business_id,id),
  unique (business_id,idempotency_key),
  unique (business_id,receipt_number),
  check (discount_ugx<=subtotal_ugx),
  check ((state='pending' and committed_at is null) or
         (state in ('committed','voided') and committed_at is not null)),
  check (receipt_number is null or char_length(receipt_number) between 1 and 80)
);
create index web_pos_sales_business_time_idx
  on private.web_pos_sales(business_id,created_at desc);

create table private.web_pos_sale_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  line_number integer not null check (line_number>0),
  quantity_milli bigint not null check (quantity_milli>0),
  unit_price_ugx bigint not null check (unit_price_ugx>=0),
  line_subtotal_ugx bigint not null check (line_subtotal_ugx>=0),
  tax_ugx bigint not null default 0 check (tax_ugx>=0),
  product_snapshot jsonb not null check (jsonb_typeof(product_snapshot)='object'),
  foreign key (business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict,
  foreign key (business_id,product_id)
    references public.desktop_products(business_id,id) on delete restrict,
  unique(business_id,sale_id,line_number),
  unique(business_id,sale_id,product_id)
);
create index web_pos_sale_lines_product_idx
  on private.web_pos_sale_lines(business_id,product_id);

-- Reservations are durable, tenant-scoped and never directly mutate the
-- desktop origin's inventory snapshot or movement-replay checkpoints.
-- The unified inventory read model must subtract active reservations before
-- this table is used for sale posting.
create table private.web_pos_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  quantity_milli bigint not null check(quantity_milli>0),
  state text not null check(state in ('held','consumed','released')),
  created_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  foreign key(business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict,
  foreign key(business_id,product_id)
    references public.desktop_products(business_id,id) on delete restrict,
  unique(business_id,sale_id,product_id)
);
create index web_pos_active_reservations_idx
  on private.web_pos_stock_reservations(business_id,product_id)
  where state='held';

-- Web-originated immutable reconciliation envelopes need a durable outbox
-- before any external acknowledgement can mark a sale fully delivered.
create table private.web_pos_reconciliation_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  event_id uuid not null default gen_random_uuid(),
  event_type text not null check(event_type in ('sale_posted','sale_voided','payment_updated')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  state text not null default 'pending'
    check(state in ('pending','in_flight','acknowledged','failed')),
  attempt_count integer not null default 0 check(attempt_count>=0),
  next_attempt_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict,
  unique(business_id,event_id),
  check((state='acknowledged')=(acknowledged_at is not null))
);
create index web_pos_reconciliation_pending_idx
  on private.web_pos_reconciliation_outbox(business_id,created_at)
  where state<>'acknowledged';

create table private.web_pos_payment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  provider text not null check(char_length(provider) between 1 and 80),
  provider_reference text,
  event_id uuid not null default gen_random_uuid(),
  state text not null check(state in ('pending','confirmed','failed','unknown','refunded')),
  amount_ugx bigint not null check(amount_ugx>=0),
  created_at timestamptz not null default now(),
  foreign key(business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict,
  unique(business_id,event_id)
);
create unique index web_pos_payment_provider_reference_idx
  on private.web_pos_payment_events(business_id,provider,provider_reference)
  where provider_reference is not null;

-- Defense in depth: these objects must not appear in the exposed API surface.
-- Server/RPC write and desktop reconciliation permissions are deliberately NOT
-- granted in this migration. Do not add permissive RLS policies to silence
-- the security advisor.
alter table private.web_pos_sales enable row level security;
alter table private.web_pos_sales force row level security;
alter table private.web_pos_sale_lines enable row level security;
alter table private.web_pos_sale_lines force row level security;
alter table private.web_pos_stock_reservations enable row level security;
alter table private.web_pos_stock_reservations force row level security;
alter table private.web_pos_reconciliation_outbox enable row level security;
alter table private.web_pos_reconciliation_outbox force row level security;
alter table private.web_pos_payment_events enable row level security;
alter table private.web_pos_payment_events force row level security;

revoke all on private.web_pos_sales from public,anon,authenticated,service_role;
revoke all on private.web_pos_sale_lines from public,anon,authenticated,service_role;
revoke all on private.web_pos_stock_reservations from public,anon,authenticated,service_role;
revoke all on private.web_pos_reconciliation_outbox from public,anon,authenticated,service_role;
revoke all on private.web_pos_payment_events from public,anon,authenticated,service_role;

comment on table private.web_pos_sales is
  'Staged web-originated sales: no client writing or checkout authorization until reconciliation qualification';
