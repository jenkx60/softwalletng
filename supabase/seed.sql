-- Local/dev seed. Passwords are Password123! — never use these in production.

CREATE OR REPLACE FUNCTION public.seed_auth_user(
  p_id uuid,
  p_email text,
  p_full_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );
END;
$$;

SELECT public.seed_auth_user(
  '11111111-1111-1111-1111-111111111111',
  'customer@softwallet.test',
  'Amaka Obi'
);
SELECT public.seed_auth_user(
  '22222222-2222-2222-2222-222222222222',
  'sales@softwallet.test',
  'Sales Staff'
);
SELECT public.seed_auth_user(
  '33333333-3333-3333-3333-333333333333',
  'inventory@softwallet.test',
  'Inventory Manager'
);
SELECT public.seed_auth_user(
  '44444444-4444-4444-4444-444444444444',
  'orders@softwallet.test',
  'Order Manager'
);
SELECT public.seed_auth_user(
  '55555555-5555-5555-5555-555555555555',
  'admin@softwallet.test',
  'Super Admin'
);

INSERT INTO public.user_roles (user_id, role) VALUES
  ('22222222-2222-2222-2222-222222222222', 'sales_staff'),
  ('33333333-3333-3333-3333-333333333333', 'inventory_manager'),
  ('44444444-4444-4444-4444-444444444444', 'order_manager'),
  ('55555555-5555-5555-5555-555555555555', 'super_admin');

INSERT INTO public.brands (id, name, slug) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Apple', 'apple'),
  ('a1000000-0000-0000-0000-000000000002', 'Samsung', 'samsung'),
  ('a1000000-0000-0000-0000-000000000003', 'Sony', 'sony');

INSERT INTO public.categories (id, name, slug) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Phones', 'phones'),
  ('b1000000-0000-0000-0000-000000000002', 'Laptops', 'laptops'),
  ('b1000000-0000-0000-0000-000000000003', 'Gaming', 'gaming'),
  ('b1000000-0000-0000-0000-000000000004', 'Audio', 'audio'),
  ('b1000000-0000-0000-0000-000000000005', 'Accessories', 'accessories');

INSERT INTO public.products (id, name, slug, description, brand_id, category_id, condition) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'iPhone 13 Pro 256GB',
    'iphone-13-pro-256gb',
    'UK-used iPhone 13 Pro, graded and IMEI verified.',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'uk_used'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'Galaxy S24 Ultra',
    'galaxy-s24-ultra',
    'New Galaxy S24 Ultra.',
    'a1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'new'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'MacBook Air M2',
    'macbook-air-m2',
    'UK-used MacBook Air M2, Grade A.',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'uk_used'
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'PS5 Slim Console',
    'ps5-slim-console',
    'PlayStation 5 Slim.',
    'a1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000003',
    'new'
  ),
  (
    'c1000000-0000-0000-0000-000000000005',
    'AirPods Pro 2',
    'airpods-pro-2',
    'New AirPods Pro 2.',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000004',
    'new'
  ),
  (
    'c1000000-0000-0000-0000-000000000006',
    'Fast Charger 20W',
    'fast-charger-20w',
    '20W USB-C charger.',
    NULL,
    'b1000000-0000-0000-0000-000000000005',
    'new'
  );

INSERT INTO public.product_variants (
  id, product_id, sku, storage, color, price, compare_at_price, is_serialized, quantity
) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'IP13P-256-GRAPHITE',
    '256GB',
    'Graphite',
    62000000,
    68000000,
    true,
    0
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'S24U-256-BLACK',
    '256GB',
    'Titanium Black',
    115000000,
    NULL,
    true,
    0
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000003',
    'MBA-M2-256-MIDNIGHT',
    '256GB',
    'Midnight',
    98000000,
    NULL,
    true,
    0
  ),
  (
    'd1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000004',
    'PS5-SLIM-1TB',
    '1TB',
    'White',
    71000000,
    NULL,
    true,
    0
  ),
  (
    'd1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000005',
    'APP2-WHITE',
    NULL,
    'White',
    15900000,
    18500000,
    true,
    0
  ),
  (
    'd1000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000006',
    'CHG-20W-USBC',
    NULL,
    NULL,
    850000,
    NULL,
    false,
    24
  );

INSERT INTO public.inventory_items (
  id, variant_id, imei, status, condition_grade, battery_health
) VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    '356938035643809',
    'available',
    'Grade A',
    88
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000002',
    '353456789012345',
    'available',
    NULL,
    NULL
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000002',
    '353456789012346',
    'available',
    NULL,
    NULL
  ),
  (
    'e1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000003',
    NULL,
    'available',
    'Grade A',
    91
  ),
  (
    'e1000000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000004',
    NULL,
    'sold',
    NULL,
    NULL
  );

UPDATE public.inventory_items
SET serial_number = 'MBA-M2-SEED-001'
WHERE id = 'e1000000-0000-0000-0000-000000000004';

UPDATE public.inventory_items
SET serial_number = 'PS5-SLIM-SEED-001'
WHERE id = 'e1000000-0000-0000-0000-000000000005';

INSERT INTO public.delivery_zones (id, name, state, fee, is_active) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'Lagos Mainland',
    'Lagos',
    250000,
    true
  );

INSERT INTO public.addresses (
  id, user_id, recipient_name, phone, line1, city, state, is_default
) VALUES (
  'aa000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Amaka Obi',
  '08012345678',
  '14 Allen Avenue',
  'Ikeja',
  'Lagos',
  true
);

INSERT INTO public.reviews (
  product_id, user_id, rating, body, is_verified, is_approved
) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    5,
    'Battery health was exactly as listed, screen has no marks.',
    true,
    true
  );

DROP FUNCTION public.seed_auth_user(uuid, text, text);
