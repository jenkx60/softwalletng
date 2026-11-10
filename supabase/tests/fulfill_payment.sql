begin;
select plan(8);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'authenticated',
  'authenticated',
  'fulfill@test.local',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Fulfill Tester"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.categories (id, name, slug)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Phones', 'phones-fulfill');

INSERT INTO public.products (id, name, slug, category_id, condition)
VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  'Fulfill Phone',
  'fulfill-phone',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'new'
);

INSERT INTO public.product_variants (
  id, product_id, sku, price, is_serialized, quantity
) VALUES (
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  'FULFILL-SKU-1',
  500000,
  true,
  0
);

INSERT INTO public.inventory_items (id, variant_id, imei, status)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4',
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  '999888777666555',
  'available'
);

INSERT INTO public.orders (
  id, order_number, user_id, status, idempotency_key,
  subtotal_amount, total_amount
) VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'SW-TEST-1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'pending',
  'idem-fulfill-1',
  500000,
  500000
);

INSERT INTO public.order_items (
  order_id, variant_id, inventory_item_id, product_name, unit_price, quantity
) VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4',
  'Fulfill Phone',
  500000,
  1
);

INSERT INTO public.payments (
  id, order_id, paystack_reference, amount, status
) VALUES (
  '99999999-9999-9999-9999-999999999991',
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'psk_ref_fulfill_1',
  500000,
  'pending'
);

INSERT INTO public.checkout_holds(order_id,variant_id,inventory_item_id,quantity,expires_at)
VALUES ('ffffffff-ffff-ffff-ffff-fffffffffff1','dddddddd-dddd-dddd-dddd-ddddddddddd2','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4',1,now()+interval '20 minutes');

SELECT results_eq(
  $$ SELECT already_paid FROM public.fulfill_payment('psk_ref_fulfill_1', 500000) $$,
  $$ VALUES (false) $$,
  'first fulfill_payment applies side effects'
);

SELECT is(
  (SELECT status FROM public.payments WHERE paystack_reference = 'psk_ref_fulfill_1'),
  'paid',
  'payment marked paid'
);

SELECT is(
  (SELECT status FROM public.orders WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffff1'),
  'paid',
  'order marked paid'
);

SELECT is(
  (SELECT status FROM public.inventory_items WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4'),
  'sold',
  'held available unit finalized to sold'
);

SELECT results_eq(
  $$ SELECT already_paid FROM public.fulfill_payment('psk_ref_fulfill_1', 500000) $$,
  $$ VALUES (true) $$,
  'second fulfill_payment is a no-op'
);

SELECT is(
  (SELECT count(*) FROM public.inventory_movements WHERE reason = 'checkout_fulfillment')::int,
  1,
  'fulfillment movement written only once'
);

INSERT INTO public.payments (
  order_id, paystack_reference, amount, status
) VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'psk_ref_mismatch_1',
  500000,
  'pending'
);

SELECT throws_ok(
  $$ SELECT public.fulfill_payment('psk_ref_mismatch_1', 100) $$,
  'P0001',
  'Payment amount mismatch',
  'fulfill_payment rejects an amount mismatch'
);

SELECT throws_ok(
  $$ INSERT INTO public.orders (
       order_number, user_id, idempotency_key, subtotal_amount, total_amount
     ) VALUES (
       'SW-TEST-DUP',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
       'idem-fulfill-1',
       1,
       1
     ) $$,
  '23505',
  NULL,
  'duplicate orders.idempotency_key is rejected'
);

select * from finish();
rollback;
