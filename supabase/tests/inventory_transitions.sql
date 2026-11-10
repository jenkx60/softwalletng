begin;
select plan(6);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'authenticated',
  'authenticated',
  'transition@test.local',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Transition Tester"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.categories (id, name, slug)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Phones', 'phones-test');

INSERT INTO public.products (id, name, slug, category_id, condition)
VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'Test Phone',
  'test-phone',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'new'
);

INSERT INTO public.product_variants (
  id, product_id, sku, price, is_serialized, quantity
) VALUES (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'TEST-SKU-1',
  100000,
  true,
  0
);

INSERT INTO public.inventory_items (id, variant_id, imei, status)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  '111222333444555',
  'available'
);

SELECT lives_ok(
  $$ UPDATE public.inventory_items
     SET status = 'reserved'
     WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1' $$,
  'available can move to reserved'
);

SELECT throws_ok(
  $$ UPDATE public.inventory_items
     SET status = 'sold'
     WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1' $$,
  'P0001',
  'Inventory can only be sold or reserved from available',
  'reserved cannot move to sold'
);

INSERT INTO public.inventory_items (id, variant_id, imei, status)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  '111222333444556',
  'damaged'
);

SELECT throws_ok(
  $$ UPDATE public.inventory_items
     SET status = 'sold'
     WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2' $$,
  'P0001',
  'Inventory can only be sold or reserved from available',
  'damaged cannot move to sold'
);

SELECT throws_ok(
  $$ UPDATE public.inventory_items
     SET status = 'reserved'
     WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2' $$,
  'P0001',
  'Inventory can only be sold or reserved from available',
  'damaged cannot move to reserved'
);

SELECT throws_ok(
  $$ INSERT INTO public.inventory_items (variant_id, imei, status)
     VALUES (
       'dddddddd-dddd-dddd-dddd-ddddddddddd1',
       '111222333444555',
       'available'
     ) $$,
  '23505',
  NULL,
  'duplicate IMEI is rejected'
);

INSERT INTO public.inventory_items (id, variant_id, serial_number, status)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3',
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'SERIAL-UNIQUE-1',
  'available'
);

SELECT throws_ok(
  $$ INSERT INTO public.inventory_items (variant_id, serial_number, status)
     VALUES (
       'dddddddd-dddd-dddd-dddd-ddddddddddd1',
       'SERIAL-UNIQUE-1',
       'available'
     ) $$,
  '23505',
  NULL,
  'duplicate serial_number is rejected'
);

select * from finish();
rollback;
