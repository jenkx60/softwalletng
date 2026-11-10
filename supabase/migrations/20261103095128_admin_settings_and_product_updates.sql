CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  store_name text NOT NULL DEFAULT 'Softwallet',
  location text NOT NULL DEFAULT 'Computer Village, Ikeja, Lagos',
  support_email text NOT NULL DEFAULT '',
  stock_alert_threshold integer NOT NULL DEFAULT 3 CHECK (stock_alert_threshold >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER store_settings_set_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_settings_staff_read ON public.store_settings FOR SELECT TO authenticated
  USING (public.has_any_staff_role());
CREATE POLICY store_settings_admin_write ON public.store_settings FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));
INSERT INTO public.store_settings DEFAULT VALUES;

CREATE FUNCTION public.admin_update_product(
  p_product_id uuid, p_variant_id uuid, p_name text, p_description text,
  p_price integer, p_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  product_row public.products;
  variant_row public.product_variants;
BEGIN
  IF length(trim(p_name)) < 2 OR p_price < 0 THEN
    RAISE EXCEPTION 'Invalid product details';
  END IF;
  SELECT * INTO product_row FROM public.products WHERE id = p_product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  SELECT * INTO variant_row FROM public.product_variants WHERE id = p_variant_id AND product_id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Variant not found'; END IF;
  UPDATE public.products SET name = trim(p_name), description = coalesce(p_description, '') WHERE id = p_product_id;
  UPDATE public.product_variants SET price = p_price WHERE id = p_variant_id;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (p_actor_id, 'update', 'product', p_product_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_product(uuid,uuid,text,text,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_product(uuid,uuid,text,text,integer,uuid) TO service_role;
