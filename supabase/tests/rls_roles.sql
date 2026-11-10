begin;
select plan(10);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  'authenticated',
  'authenticated',
  'customer-rls@test.local',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Customer RLS"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  'authenticated',
  'authenticated',
  'staff-rls@test.local',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Staff RLS"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'inventory_manager');

INSERT INTO public.categories (id, name, slug)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'Phones', 'phones-rls');

INSERT INTO public.products (id, name, slug, category_id, condition)
VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccccc3',
  'RLS Phone',
  'rls-phone',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  'new'
);

INSERT INTO public.product_variants (
  id, product_id, sku, price, is_serialized, quantity
) VALUES (
  'dddddddd-dddd-dddd-dddd-ddddddddddd3',
  'cccccccc-cccc-cccc-cccc-ccccccccccc3',
  'RLS-SKU-1',
  100000,
  true,
  0
);

INSERT INTO public.inventory_items (id, variant_id, imei, status)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5',
  'dddddddd-dddd-dddd-dddd-ddddddddddd3',
  '444555666777888',
  'available'
);

INSERT INTO public.orders (
  id, order_number, user_id, status, idempotency_key,
  subtotal_amount, total_amount
) VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff2',
  'SW-RLS-1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  'pending',
  'idem-rls-1',
  100000,
  100000
);

CREATE OR REPLACE FUNCTION public.test_as(uid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
END;
$$;

SET LOCAL ROLE authenticated;
SELECT public.test_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');

SELECT ok(
  (SELECT count(*) > 0 FROM public.products WHERE slug = 'rls-phone'),
  'customer can read catalogue products'
);

SELECT is(
  (SELECT count(*) FROM public.inventory_items)::int,
  0,
  'customer cannot read inventory_items'
);

SELECT is(
  (SELECT count(*) FROM public.orders)::int,
  1,
  'customer can read their own orders'
);

SELECT throws_ok(
  $$ INSERT INTO public.inventory_items (variant_id, imei, status)
     VALUES (
       'dddddddd-dddd-dddd-dddd-ddddddddddd3',
       '000111222333444',
       'available'
     ) $$,
  '42501',
  NULL,
  'customer cannot insert inventory_items'
);

SELECT throws_ok(
  $$ SELECT public.fulfill_payment('nope', 1) $$,
  '42501',
  NULL,
  'authenticated cannot execute fulfill_payment'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT public.test_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4');

SELECT ok(
  (SELECT count(*) > 0 FROM public.inventory_items),
  'inventory_manager can read inventory_items'
);

SELECT lives_ok(
  $$ UPDATE public.products
     SET description = 'updated by inventory manager'
     WHERE id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3' $$,
  'inventory_manager can update products'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT public.test_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');

SELECT is(
  (SELECT description FROM public.products WHERE id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3'),
  'updated by inventory manager',
  'customer can see the staff product update'
);

UPDATE public.products
SET description = 'customer rewrite'
WHERE id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
SELECT is(
  (SELECT description FROM public.products WHERE id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3'),
  'updated by inventory manager',
  'customer cannot update products'
);

SELECT is(
  (SELECT count(*) FROM public.audit_logs)::int,
  0,
  'customer cannot read audit_logs'
);

RESET ROLE;
DROP FUNCTION public.test_as(uuid);

select * from finish();
rollback;
