begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email)
values
  ('30000000-0000-0000-0000-000000000003', 'owner@example.test'),
  ('40000000-0000-0000-0000-000000000004', 'staff@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000003';

select lives_ok(
  $$select public.onboard_business('Owner Business', null, null, null, 'en-UG', 'Africa/Kampala', 'UGX')$$,
  'authenticated onboarding creates a business transactionally'
);

select results_eq(
  $$select count(*) from public.business_memberships where user_id = '30000000-0000-0000-0000-000000000003' and role = 'owner' and active$$,
  array[1::bigint],
  'onboarding creates exactly one active owner membership'
);

select results_eq(
  $$select count(*) from public.audit_events where actor_id = '30000000-0000-0000-0000-000000000003' and event_type = 'business.created'$$,
  array[1::bigint],
  'onboarding creates a business.created audit event'
);

select lives_ok(
  $$update public.businesses set trading_name = 'Owner Trading' where name = 'Owner Business'$$,
  'owner can update their own business profile'
);

select results_eq(
  $$select count(*) from public.audit_events where event_type = 'business.profile_updated'$$,
  array[1::bigint],
  'profile update creates one immutable audit event'
);

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000004';

select results_eq(
  $$select count(*) from public.businesses where name = 'Owner Business'$$,
  array[0::bigint],
  'non-member cannot read the owner business profile'
);

select results_eq(
  $$with changed as (update public.businesses set trading_name = 'Attempted change' where name = 'Owner Business' returning 1) select count(*) from changed$$,
  array[0::bigint],
  'non-member has no profile row available to update'
);

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000003';

select results_eq(
  $$select trading_name from public.businesses where name = 'Owner Business'$$,
  array['Owner Trading']::text[],
  'non-member update does not change the owner business profile'
);

select * from finish();
rollback;
