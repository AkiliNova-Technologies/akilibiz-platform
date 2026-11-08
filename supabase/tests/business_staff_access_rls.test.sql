begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
 ('a1000000-0000-0000-0000-000000000001', 'team-owner@example.test'),
 ('a2000000-0000-0000-0000-000000000002', 'team-staff@example.test');

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';

select lives_ok(
 $$select public.onboard_business('Team Access Test', null, null, null, 'en-UG', 'Africa/Kampala', 'UGX')$$,
 'owner can create a business'
);
select results_eq(
 $$select count(*) from public.list_business_staff((select id from public.businesses where name = 'Team Access Test'))$$,
 array[1::bigint],
 'owner sees only the initial owner membership'
);
select lives_ok(
 $$select public.grant_business_staff((select id from public.businesses where name = 'Team Access Test'), 'team-staff@example.test', 'cashier')$$,
 'owner grants access to an existing user'
);
select results_eq(
 $$select count(*) from public.list_business_staff((select id from public.businesses where name = 'Team Access Test')) where role = 'cashier' and active$$,
 array[1::bigint],
 'granted staff appears in the owner directory'
);

set local request.jwt.claim.sub = 'a2000000-0000-0000-0000-000000000002';

select results_eq(
 $$select count(*) from public.businesses where name = 'Team Access Test'$$,
 array[1::bigint],
 'active staff can read their assigned business'
);
select throws_ok(
 $$select public.grant_business_staff((select id from public.businesses where name = 'Team Access Test'), 'team-staff@example.test', 'manager')$$,
 'P0001',
 'Not allowed to manage this business team',
 'non-owner cannot grant staff access'
);
select throws_ok(
 $$select public.list_business_staff((select id from public.businesses where name = 'Team Access Test'))$$,
 'P0001',
 'Not allowed to view business team',
 'non-owner cannot list team email addresses'
);

set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';

select lives_ok(
 $$select public.deactivate_business_staff((select id from public.businesses where name = 'Team Access Test'), 'a2000000-0000-0000-0000-000000000002')$$,
 'owner can deactivate non-owner membership'
);

set local request.jwt.claim.sub = 'a2000000-0000-0000-0000-000000000002';

select results_eq(
 $$select count(*) from public.businesses where name = 'Team Access Test'$$,
 array[0::bigint],
 'deactivated staff immediately loses RLS business visibility'
);

set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';

select throws_ok(
 $$select public.grant_business_staff((select id from public.businesses where name = 'Team Access Test'), 'team-staff@example.test', 'owner')$$,
 'P0001',
 'Only non-owner roles can be granted',
 'owner roles cannot be assigned through staff management'
);

select * from finish();
rollback;
