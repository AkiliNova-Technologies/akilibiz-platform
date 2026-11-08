begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.businesses'::regclass), 'businesses has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.business_memberships'::regclass), 'business_memberships has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit_events has RLS');

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'one@example.test'),
  ('20000000-0000-0000-0000-000000000002', 'two@example.test');

insert into public.profiles (id, display_name)
values
  ('10000000-0000-0000-0000-000000000001', 'One'),
  ('20000000-0000-0000-0000-000000000002', 'Two');

insert into public.businesses (id, name, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'One Business', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'Two Business', '20000000-0000-0000-0000-000000000002');

set local role anon;
select results_eq('select count(*) from public.profiles', array[0::bigint], 'anon cannot read profiles');
select results_eq('select count(*) from public.businesses', array[0::bigint], 'anon cannot read businesses');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select results_eq('select name from public.businesses order by name', array['One Business']::text[], 'member sees only their business');
select results_eq('select display_name from public.profiles order by display_name', array['One']::text[], 'user sees only own profile');
select results_eq('select count(*) from public.business_memberships', array[1::bigint], 'user sees only own active membership');
select results_eq('select count(*) from public.audit_events', array[1::bigint], 'user sees audit events only for their business');
select lives_ok(
  $$insert into public.businesses (name) values ('Created by One')$$,
  'authenticated user can create a business'
);
select results_eq(
  $$select count(*) from public.business_memberships where business_id = (select id from public.businesses where name = 'Created by One') and user_id = '10000000-0000-0000-0000-000000000001' and role = 'owner' and active$$,
  array[1::bigint],
  'business creation transaction creates active owner membership'
);

select * from finish();
rollback;
