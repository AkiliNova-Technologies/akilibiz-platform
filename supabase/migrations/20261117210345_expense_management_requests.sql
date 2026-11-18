-- Default-off web -> desktop authoritative expense commands. Hosted state is
-- an immutable review queue only; it never posts accounting facts.
create table private.desktop_expense_command_controls(
 business_id uuid primary key references public.businesses(id) on delete restrict,
 creation_enabled boolean not null default false,
 settlement_enabled boolean not null default false,
 void_enabled boolean not null default false
);
create table private.desktop_expense_commands(
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete restrict,
 request_id uuid not null, requested_by uuid not null references auth.users(id) on delete restrict,
 source_business_public_id text not null, source_device_public_id uuid not null,
 operation text not null check(operation in ('create','settle','void')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=32768),
 payload_digest text not null, state text not null default 'pending' check(state in ('pending','applied','rejected')),
 decision_reason text check(decision_reason is null or char_length(decision_reason)<=500),
 result jsonb check(result is null or jsonb_typeof(result)='object' and pg_column_size(result)<=32768),
 created_at timestamptz not null default now(), decided_at timestamptz,
 unique(business_id,requested_by,request_id),
 check((state='pending' and decided_at is null and result is null) or (state='applied' and decided_at is not null and result is not null) or (state='rejected' and decided_at is not null and result is null and decision_reason is not null))
);
create index desktop_expense_commands_pending_idx on private.desktop_expense_commands(business_id,source_business_public_id,source_device_public_id,created_at,id) where state='pending';
alter table private.desktop_expense_command_controls enable row level security; alter table private.desktop_expense_command_controls force row level security;
alter table private.desktop_expense_commands enable row level security; alter table private.desktop_expense_commands force row level security;
revoke all on private.desktop_expense_command_controls,private.desktop_expense_commands from public,anon,authenticated,service_role;

create function private.enqueue_expense_command(target_business_id uuid,request_id uuid,source_business_public_id text,command_operation text,command_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); device uuid; digest text; prior private.desktop_expense_commands%rowtype; command uuid; enabled boolean;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then raise exception 'Business owner access required' using errcode='42501'; end if;
 if request_id is null or substring(request_id::text from 15 for 1)<>'4' or command_operation not in ('create','settle','void') or jsonb_typeof(command_payload)<>'object' or pg_column_size(command_payload)>32768 then raise exception 'Invalid expense command' using errcode='22023'; end if;
 select case command_operation when 'create' then creation_enabled when 'settle' then settlement_enabled else void_enabled end into enabled from private.desktop_expense_command_controls where business_id=target_business_id;
 if not coalesce(enabled,false) then raise exception 'Expense command is disabled' using errcode='55000'; end if;
 select d.device_public_id into device from private.desktop_devices d where d.business_id=target_business_id and d.local_business_public_id=source_business_public_id and d.paired_by=actor and d.revoked_at is null order by d.paired_at,d.id limit 1;
 if device is null then raise exception 'No active paired desktop' using errcode='42501'; end if;
 digest:=encode(sha256(convert_to(command_operation||':'||command_payload::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('expense:'||target_business_id::text||':'||request_id::text,0));
 select * into prior from private.desktop_expense_commands c where c.business_id=target_business_id and c.requested_by=actor and c.request_id=enqueue_expense_command.request_id;
 if found then if prior.operation<>command_operation or prior.payload_digest<>digest then raise exception 'Request identity reused with changed expense details' using errcode='23505'; end if; return prior.id; end if;
 insert into private.desktop_expense_commands(business_id,request_id,requested_by,source_business_public_id,source_device_public_id,operation,payload,payload_digest)
 values(target_business_id,request_id,actor,source_business_public_id,device,command_operation,command_payload,digest) returning id into command; return command;
end $$;

create function public.request_desktop_expense_creation(target_business_id uuid,request_id uuid,source_business_public_id text,expense jsonb)
returns uuid language plpgsql security definer set search_path='' as $$ declare p jsonb; begin
 if jsonb_typeof(expense)<>'object' or not(expense ?& array['category_id','payment_basis','payment_method','effective_date','net_ugx','tax_ugx','gross_ugx','input_vat_eligible','non_deductible']) or
  (expense->>'category_id')!~'^[1-9][0-9]*$' or expense->>'payment_basis' not in ('paid','supplier_credit') or expense->>'payment_method' not in ('Cash','Mobile Money','Bank Transfer','Card','Cheque','Other') or
  (expense->>'net_ugx')!~'^[0-9]+$' or (expense->>'tax_ugx')!~'^[0-9]+$' or (expense->>'gross_ugx')!~'^[1-9][0-9]*$' or
  (expense->>'net_ugx')::numeric+(expense->>'tax_ugx')::numeric<>(expense->>'gross_ugx')::numeric or (expense->>'gross_ugx')::numeric>9007199254740991 or
  jsonb_typeof(expense->'input_vat_eligible')<>'boolean' or jsonb_typeof(expense->'non_deductible')<>'boolean' or
  expense->>'payment_basis'='supplier_credit' and coalesce(expense->>'supplier_id','')!~'^[1-9][0-9]*$' or
  coalesce(char_length(expense->>'description'),0)>1000 or coalesce(char_length(expense->>'invoice_reference'),0)>120 or coalesce(char_length(expense->>'invoice_issuer'),0)>200 then
  raise exception 'Invalid expense creation request' using errcode='22023'; end if;
 if (expense->>'input_vat_eligible')::boolean and ((expense->>'non_deductible')::boolean or (expense->>'tax_ugx')::bigint=0 or nullif(btrim(expense->>'invoice_reference'),'') is null or nullif(btrim(expense->>'invoice_issuer'),'') is null or nullif(expense->>'source_document_date','') is null) then raise exception 'Recoverable VAT requires supplier evidence' using errcode='22023'; end if;
 p:=expense||jsonb_build_object('idempotency_key',request_id::text); return private.enqueue_expense_command(target_business_id,request_id,source_business_public_id,'create',p);
end $$;

create function public.request_desktop_expense_settlement(target_business_id uuid,request_id uuid,source_business_public_id text,payable_id bigint,amount_ugx bigint,effective_date date,payment_method text,reference text)
returns uuid language plpgsql security definer set search_path='' as $$ declare mirrored jsonb; p jsonb; begin
 if payable_id<=0 or amount_ugx<=0 or payment_method not in ('Cash','Mobile Money','Bank Transfer','Card','Cheque','Other') or char_length(btrim(reference)) not between 1 and 120 then raise exception 'Invalid expense settlement request' using errcode='22023'; end if;
 select r.record into mirrored from public.desktop_business_records r where r.business_id=target_business_id and r.local_business_public_id=source_business_public_id and r.entity_type='expense_payables' and r.local_record_id=payable_id;
 if mirrored is null or mirrored->>'state'<>'open' or coalesce(mirrored->>'outstanding_amount_ugx','')!~'^[1-9][0-9]*$' or amount_ugx>(mirrored->>'outstanding_amount_ugx')::bigint then raise exception 'Expense liability is no longer eligible' using errcode='23503'; end if;
 p:=jsonb_build_object('payable_id',payable_id,'amount_ugx',amount_ugx,'effective_date',to_char(effective_date,'YYYY-MM-DD'),'payment_method',payment_method,'reference',btrim(reference),'idempotency_key',request_id::text);
 return private.enqueue_expense_command(target_business_id,request_id,source_business_public_id,'settle',p);
end $$;

create function public.request_desktop_expense_void(target_business_id uuid,request_id uuid,source_business_public_id text,expense_id bigint,effective_date date,reason text)
returns uuid language plpgsql security definer set search_path='' as $$ declare mirrored jsonb; p jsonb; begin
 if expense_id<=0 or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Void reason required' using errcode='22023'; end if;
 select r.record into mirrored from public.desktop_business_records r where r.business_id=target_business_id and r.local_business_public_id=source_business_public_id and r.entity_type='authoritative_expenses' and r.local_record_id=expense_id;
 if mirrored is null or mirrored->>'state'<>'posted' then raise exception 'Only a synchronized posted expense may be voided' using errcode='23503'; end if;
 p:=jsonb_build_object('expense_id',expense_id,'effective_date',to_char(effective_date,'YYYY-MM-DD'),'reason',btrim(reason),'idempotency_key',request_id::text);
 return private.enqueue_expense_command(target_business_id,request_id,source_business_public_id,'void',p);
end $$;

create function public.list_desktop_expense_command_statuses(target_business_id uuid) returns table(command_id uuid,request_id uuid,operation text,state text,reason text,result jsonb,payload jsonb,requested_at timestamptz,decided_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin if not private.is_active_business_owner(target_business_id) then raise exception 'Owner access required' using errcode='42501'; end if; return query select c.id,c.request_id,c.operation,c.state,c.decision_reason,c.result,c.payload,c.created_at,c.decided_at from private.desktop_expense_commands c where c.business_id=target_business_id and c.requested_by=(select auth.uid()) order by c.created_at desc,c.id desc limit 100; end $$;
create function public.list_pending_desktop_expense_commands(target_business_id uuid,source_business_public_id text,source_device_public_id uuid,batch_limit integer default 20) returns table(command_id uuid,operation text,payload jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id); if batch_limit not between 1 and 20 then raise exception 'Invalid batch limit' using errcode='22023'; end if; return query select c.id,c.operation,c.payload,c.created_at from private.desktop_expense_commands c join private.desktop_expense_command_controls x using(business_id) where c.business_id=target_business_id and c.source_business_public_id=list_pending_desktop_expense_commands.source_business_public_id and c.source_device_public_id=list_pending_desktop_expense_commands.source_device_public_id and c.state='pending' and case c.operation when 'create' then x.creation_enabled when 'settle' then x.settlement_enabled else x.void_enabled end order by c.created_at,c.id limit batch_limit; end $$;
create function public.verify_pending_desktop_expense_command(target_business_id uuid,source_business_public_id text,source_device_public_id uuid,command_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$ begin perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id); return exists(select 1 from private.desktop_expense_commands c join private.desktop_expense_command_controls x using(business_id) where c.business_id=target_business_id and c.id=command_id and c.state='pending' and c.source_business_public_id=verify_pending_desktop_expense_command.source_business_public_id and c.source_device_public_id=verify_pending_desktop_expense_command.source_device_public_id and case c.operation when 'create' then x.creation_enabled when 'settle' then x.settlement_enabled else x.void_enabled end); end $$;
create function public.acknowledge_desktop_expense_command(target_business_id uuid,source_business_public_id text,source_device_public_id uuid,command_id uuid,command_result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$ declare c private.desktop_expense_commands%rowtype; begin perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id); if jsonb_typeof(command_result)<>'object' or pg_column_size(command_result)>32768 then raise exception 'Invalid result' using errcode='22023'; end if; select * into c from private.desktop_expense_commands x where x.business_id=target_business_id and x.id=command_id and x.source_business_public_id=acknowledge_desktop_expense_command.source_business_public_id and x.source_device_public_id=acknowledge_desktop_expense_command.source_device_public_id for update; if not found then raise exception 'Command not found' using errcode='42501'; end if; if c.state='applied' then return c.result=command_result; end if; if c.state<>'pending' then return false; end if; update private.desktop_expense_commands set state='applied',result=command_result,decided_at=now() where business_id=target_business_id and id=command_id; return true; end $$;
create function public.reject_desktop_expense_command(target_business_id uuid,source_business_public_id text,source_device_public_id uuid,command_id uuid,rejection_reason text) returns boolean
language plpgsql security definer set search_path='' as $$ declare c private.desktop_expense_commands%rowtype; begin perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id); if char_length(btrim(rejection_reason)) not between 1 and 500 then raise exception 'Reason required' using errcode='22023'; end if; select * into c from private.desktop_expense_commands x where x.business_id=target_business_id and x.id=command_id and x.source_business_public_id=reject_desktop_expense_command.source_business_public_id and x.source_device_public_id=reject_desktop_expense_command.source_device_public_id for update; if not found then raise exception 'Command not found' using errcode='42501'; end if; if c.state='rejected' then return c.decision_reason=btrim(rejection_reason); end if; if c.state<>'pending' then return false; end if; update private.desktop_expense_commands set state='rejected',decision_reason=btrim(rejection_reason),decided_at=now() where business_id=target_business_id and id=command_id; return true; end $$;

revoke all on function private.enqueue_expense_command(uuid,uuid,text,text,jsonb),public.request_desktop_expense_creation(uuid,uuid,text,jsonb),public.request_desktop_expense_settlement(uuid,uuid,text,bigint,bigint,date,text,text),public.request_desktop_expense_void(uuid,uuid,text,bigint,date,text),public.list_desktop_expense_command_statuses(uuid),public.list_pending_desktop_expense_commands(uuid,text,uuid,integer),public.verify_pending_desktop_expense_command(uuid,text,uuid,uuid),public.acknowledge_desktop_expense_command(uuid,text,uuid,uuid,jsonb),public.reject_desktop_expense_command(uuid,text,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_expense_creation(uuid,uuid,text,jsonb),public.request_desktop_expense_settlement(uuid,uuid,text,bigint,bigint,date,text,text),public.request_desktop_expense_void(uuid,uuid,text,bigint,date,text),public.list_desktop_expense_command_statuses(uuid),public.list_pending_desktop_expense_commands(uuid,text,uuid,integer),public.verify_pending_desktop_expense_command(uuid,text,uuid,uuid),public.acknowledge_desktop_expense_command(uuid,text,uuid,uuid,jsonb),public.reject_desktop_expense_command(uuid,text,uuid,uuid,text) to authenticated;
