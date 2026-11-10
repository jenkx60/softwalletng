begin;
select plan(6);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa94','authenticated','authenticated','photo-staff@test.local',crypt('Password123!',gen_salt('bf')),now(),'{}','{}',now(),now());
insert into public.user_roles (user_id,role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa94','inventory_manager');
insert into public.products (id,name,slug,is_published) values
('cccccccc-cccc-cccc-cccc-cccccccccc94','Visible Photo Test','visible-photo-test',true),
('cccccccc-cccc-cccc-cccc-cccccccccc95','Hidden Photo Test','hidden-photo-test',false);
insert into public.product_images (product_id,storage_path) values
('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc94/11111111-1111-4111-8111-111111111194.jpg'),
('cccccccc-cccc-cccc-cccc-cccccccccc95','cccccccc-cccc-cccc-cccc-cccccccccc95/11111111-1111-4111-8111-111111111195.jpg');

set local role anon;
select is((select count(*)::int from public.product_images where product_id in ('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc95')),1,'anon sees published photo only');
select throws_ok($$insert into public.product_images(product_id,storage_path) values ('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc94/11111111-1111-4111-8111-111111111196.jpg')$$,'42501',null,'anon cannot insert photo records');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated')::text,true);
select is((select count(*)::int from public.product_images where product_id in ('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc95')),1,'customer sees published photo only');
select throws_ok($$insert into public.product_images(product_id,storage_path) values ('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc94/11111111-1111-4111-8111-111111111197.jpg')$$,'42501',null,'customer cannot insert photo records');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa94','role','authenticated')::text,true);
select is((select count(*)::int from public.product_images where product_id in ('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc95')),2,'inventory manager sees draft photos');
select throws_ok($$insert into public.product_images(product_id,storage_path) values ('cccccccc-cccc-cccc-cccc-cccccccccc94','cccccccc-cccc-cccc-cccc-cccccccccc94/11111111-1111-4111-8111-111111111198.jpg')$$,'42501',null,'staff cannot write photo records directly');
reset role;

select * from finish();
rollback;
