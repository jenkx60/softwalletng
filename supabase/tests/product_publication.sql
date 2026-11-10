begin;
select plan(6);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa92','authenticated','authenticated','publication-test@test.local',crypt('Password123!',gen_salt('bf')),now(),'{}','{}',now(),now());
insert into public.user_roles (user_id,role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa92','inventory_manager');
insert into public.products (id,name,slug,condition,is_published) values
('cccccccc-cccc-cccc-cccc-cccccccccc92','Published Test','published-test','new',true),
('cccccccc-cccc-cccc-cccc-cccccccccc93','Draft Test','draft-test','new',false);
insert into public.product_variants (id,product_id,sku,price) values
('dddddddd-dddd-dddd-dddd-dddddddddd92','cccccccc-cccc-cccc-cccc-cccccccccc92','PUBLISHED-TEST',100000),
('dddddddd-dddd-dddd-dddd-dddddddddd93','cccccccc-cccc-cccc-cccc-cccccccccc93','DRAFT-TEST',100000);

set local role anon;
select is((select count(*)::int from public.products where slug in ('published-test','draft-test')),1,'anon sees published product only');
select is((select count(*)::int from public.product_variants where sku in ('PUBLISHED-TEST','DRAFT-TEST')),1,'anon sees published variant only');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa92','role','authenticated')::text,true);
select is((select count(*)::int from public.products where slug in ('published-test','draft-test')),2,'inventory manager sees drafts');
select is((select count(*)::int from public.product_variants where sku in ('PUBLISHED-TEST','DRAFT-TEST')),2,'inventory manager sees draft variants');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
select is((select count(*)::int from public.products where slug in ('published-test','draft-test')),1,'customer cannot see draft');
select is((select count(*)::int from public.product_variants where sku in ('PUBLISHED-TEST','DRAFT-TEST')),1,'customer cannot see draft variant');
reset role;

select * from finish();
rollback;
