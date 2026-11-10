-- Create a product and its first variant atomically so the storefront never
-- sees a product whose price failed to save.
CREATE FUNCTION public.admin_create_catalogue_product(
  p_name text, p_slug text, p_description text, p_condition text,
  p_brand_id uuid, p_category_id uuid, p_sku text,
  p_price integer, p_is_serialized boolean, p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_product_id uuid;
BEGIN
  IF length(trim(p_name)) < 2 OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     OR length(trim(p_sku)) < 2 OR p_price < 0
     OR p_condition NOT IN ('new', 'uk_used') THEN
    RAISE EXCEPTION 'Invalid product details';
  END IF;

  INSERT INTO public.products (name, slug, description, condition, brand_id, category_id)
  VALUES (trim(p_name), p_slug, coalesce(p_description, ''), p_condition, p_brand_id, p_category_id)
  RETURNING id INTO new_product_id;

  INSERT INTO public.product_variants (product_id, sku, price, is_serialized)
  VALUES (new_product_id, trim(p_sku), p_price, p_is_serialized);

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (p_actor_id, 'create', 'product', new_product_id);
  RETURN new_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_catalogue_product(text,text,text,text,uuid,uuid,text,integer,boolean,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_catalogue_product(text,text,text,text,uuid,uuid,text,integer,boolean,uuid) TO service_role;
