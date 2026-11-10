begin;
select plan(5);
insert into auth.users(id,email,raw_user_meta_data) values
('a0111111-1111-4111-8111-111111111111','address-owner@test.local','{}'),
('a0222222-2222-4222-8222-222222222222','address-other@test.local','{}');
insert into public.addresses(id,user_id,recipient_name,phone,line1,city,state) values
('a0333333-3333-4333-8333-333333333333','a0111111-1111-4111-8111-111111111111','Owner','08012345678','Original street','Ikeja','Lagos');
insert into public.orders(order_number,user_id,idempotency_key,subtotal_amount,total_amount,address_id,address_snapshot) values
('ADDRESS-TEST','a0111111-1111-4111-8111-111111111111','address-test',100,100,'a0333333-3333-4333-8333-333333333333','{"line1":"Original street"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a0222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
with removed as (delete from public.addresses where id='a0333333-3333-4333-8333-333333333333' returning id)
select is((select count(*)::int from removed),0,'another customer cannot delete address');
with changed as (update public.addresses set line1='Stolen' where id='a0333333-3333-4333-8333-333333333333' returning id)
select is((select count(*)::int from changed),0,'another customer cannot edit address');
select set_config('request.jwt.claims','{"sub":"a0111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
with changed as (update public.addresses set line1='New street' where id='a0333333-3333-4333-8333-333333333333' returning id)
select is((select count(*)::int from changed),1,'owner can edit address');
delete from public.addresses where id='a0333333-3333-4333-8333-333333333333';
select ok((select address_id is null from public.orders where order_number='ADDRESS-TEST'),'removing address preserves order');
select is((select address_snapshot->>'line1' from public.orders where order_number='ADDRESS-TEST'),'Original street','order preserves original delivery details');
select * from finish();
rollback;
