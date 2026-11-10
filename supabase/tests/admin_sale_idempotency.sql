begin;
select plan(8);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa91','authenticated','authenticated','sale-test@test.local',crypt('Password123!',gen_salt('bf')),now(),'{}','{}',now(),now());
insert into public.products (id,name,slug,condition)
values ('cccccccc-cccc-cccc-cccc-cccccccccc91','Sale Test Charger','sale-test-charger','new');
insert into public.product_variants (id,product_id,sku,price,is_serialized,quantity)
values ('dddddddd-dddd-dddd-dddd-dddddddddd91','cccccccc-cccc-cccc-cccc-cccccccccc91','SALE-TEST-CHARGER',1700000,false,2);

select lives_ok(
  $$select public.admin_record_physical_sale_once('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee91',null,'dddddddd-dddd-dddd-dddd-dddddddddd91',1,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa91','cash')$$,
  'first request creates one order'
);
select is(
  public.admin_record_physical_sale_once('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee91',null,'dddddddd-dddd-dddd-dddd-dddddddddd91',1,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa91','cash'),
  (select order_id from public.physical_sale_requests where idempotency_key='eeeeeeee-eeee-eeee-eeee-eeeeeeeeee91'),
  'retry returns same order'
);
select is((select count(*)::int from public.orders where id in (select order_id from public.order_items where variant_id='dddddddd-dddd-dddd-dddd-dddddddddd91')),1,'retry did not create a second order');
select is((select quantity from public.product_variants where id='dddddddd-dddd-dddd-dddd-dddddddddd91'),1,'retry decremented stock once');
select is((select count(*)::int from public.inventory_movements where variant_id='dddddddd-dddd-dddd-dddd-dddddddddd91'),1,'retry wrote one movement');
select lives_ok($$select public.admin_record_physical_sale_once('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee92',null,'dddddddd-dddd-dddd-dddd-dddddddddd91',1,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa91','cash')$$,'a new sale uses remaining stock');
select throws_ok($$select public.admin_record_physical_sale_once('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee93',null,'dddddddd-dddd-dddd-dddd-dddddddddd91',1,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa91','cash')$$,'P0001','Insufficient quantity or invalid variant','out-of-stock sale is rejected');
select is((select quantity from public.product_variants where id='dddddddd-dddd-dddd-dddd-dddddddddd91'),0,'rejected sale leaves stock unchanged');

select * from finish();
rollback;
