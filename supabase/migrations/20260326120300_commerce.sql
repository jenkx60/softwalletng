-- Addresses, delivery, carts, orders, payments, discounts, reviews, audit.

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  label text,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX addresses_user_id_idx ON public.addresses (user_id);

CREATE TRIGGER addresses_set_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text,
  fee integer NOT NULL DEFAULT 0 CHECK (fee >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER delivery_zones_set_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  session_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TRIGGER carts_set_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts (id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  inventory_item_id uuid REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id, inventory_item_id)
);

CREATE INDEX cart_items_cart_id_idx ON public.cart_items (cart_id);
CREATE INDEX cart_items_variant_id_idx ON public.cart_items (variant_id);

CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value integer NOT NULL CHECK (value >= 0),
  min_amount integer CHECK (min_amount IS NULL OR min_amount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER discounts_set_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles (id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'paid',
      'fulfilled',
      'cancelled',
      'refunded'
    )),
  fulfillment_channel text NOT NULL DEFAULT 'online'
    CHECK (fulfillment_channel IN ('online', 'in_store')),
  idempotency_key text NOT NULL UNIQUE,
  subtotal_amount integer NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount integer NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  delivery_fee integer NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  address_id uuid REFERENCES public.addresses (id),
  delivery_zone_id uuid REFERENCES public.delivery_zones (id),
  discount_id uuid REFERENCES public.discounts (id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON public.orders (user_id);
CREATE INDEX orders_address_id_idx ON public.orders (address_id);
CREATE INDEX orders_delivery_zone_id_idx ON public.orders (delivery_zone_id);
CREATE INDEX orders_status_idx ON public.orders (status);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  inventory_item_id uuid REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  variant_label text,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX order_items_variant_id_idx ON public.order_items (variant_id);
CREATE INDEX order_items_inventory_item_id_idx ON public.order_items (inventory_item_id);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  paystack_reference text NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'abandoned')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_id_idx ON public.payments (order_id);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders (id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '',
  is_verified boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_product_id_idx ON public.reviews (product_id);
CREATE INDEX reviews_user_id_idx ON public.reviews (user_id);

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs (actor_id);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY addresses_own
  ON public.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY addresses_staff_read
  ON public.addresses FOR SELECT TO authenticated
  USING (public.has_any_staff_role());

CREATE POLICY delivery_zones_public_read
  ON public.delivery_zones FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_any_staff_role());

CREATE POLICY delivery_zones_admin_write
  ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR public.has_role('order_manager'))
  WITH CHECK (public.has_role('super_admin') OR public.has_role('order_manager'));

CREATE POLICY carts_own
  ON public.carts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cart_items_own
  ON public.cart_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY discounts_public_read_active
  ON public.discounts FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_any_staff_role());

CREATE POLICY discounts_staff_write
  ON public.discounts FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR public.has_role('order_manager'))
  WITH CHECK (public.has_role('super_admin') OR public.has_role('order_manager'));

CREATE POLICY orders_own_read
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_staff_role());

CREATE POLICY orders_own_insert
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY orders_staff_update
  ON public.orders FOR UPDATE TO authenticated
  USING (
    public.has_role('order_manager')
    OR public.has_role('super_admin')
    OR public.has_role('sales_staff')
  )
  WITH CHECK (
    public.has_role('order_manager')
    OR public.has_role('super_admin')
    OR public.has_role('sales_staff')
  );

CREATE POLICY order_items_own_read
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid() OR public.has_any_staff_role())
    )
  );

CREATE POLICY order_items_own_insert
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY payments_own_read
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid() OR public.has_any_staff_role())
    )
  );

-- Payments are append-only from the client. Inserts/updates happen via
-- service-role fulfillment (bypasses RLS).
CREATE POLICY payments_no_client_write
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY reviews_public_read_approved
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (is_approved = true OR user_id = auth.uid() OR public.has_any_staff_role());

CREATE POLICY reviews_own_insert
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY reviews_own_update
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY reviews_staff_moderate
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_any_staff_role())
  WITH CHECK (public.has_any_staff_role());

CREATE POLICY audit_logs_super_admin_read
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role('super_admin'));
