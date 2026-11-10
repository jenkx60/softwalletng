-- Catalogue: brands, categories, products, variants. Soft delete on
-- products and categories only. Prices are integer kobo.

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER brands_set_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories (id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_parent_id_idx ON public.categories (parent_id);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  brand_id uuid REFERENCES public.brands (id),
  category_id uuid REFERENCES public.categories (id),
  condition text NOT NULL DEFAULT 'new'
    CHECK (condition IN ('new', 'uk_used')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_brand_id_idx ON public.products (brand_id);
CREATE INDEX products_category_id_idx ON public.products (category_id);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  sku text NOT NULL UNIQUE,
  storage text,
  color text,
  price integer NOT NULL CHECK (price >= 0),
  compare_at_price integer CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  is_serialized boolean NOT NULL DEFAULT true,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_variants_product_id_idx ON public.product_variants (product_id);

CREATE TRIGGER product_variants_set_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_public_read
  ON public.brands FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY brands_staff_write
  ON public.brands FOR ALL TO authenticated
  USING (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  )
  WITH CHECK (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  );

CREATE POLICY categories_public_read
  ON public.categories FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_any_staff_role());

CREATE POLICY categories_staff_write
  ON public.categories FOR ALL TO authenticated
  USING (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  )
  WITH CHECK (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  );

CREATE POLICY products_public_read
  ON public.products FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_any_staff_role());

CREATE POLICY products_staff_write
  ON public.products FOR ALL TO authenticated
  USING (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  )
  WITH CHECK (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  );

CREATE POLICY product_variants_public_read
  ON public.product_variants FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_id
        AND (p.deleted_at IS NULL OR public.has_any_staff_role())
    )
  );

CREATE POLICY product_variants_staff_write
  ON public.product_variants FOR ALL TO authenticated
  USING (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  )
  WITH CHECK (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  );
