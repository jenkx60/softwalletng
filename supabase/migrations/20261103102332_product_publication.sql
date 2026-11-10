ALTER TABLE public.products ADD COLUMN is_published boolean NOT NULL DEFAULT true;

DROP POLICY products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products FOR SELECT TO anon, authenticated
USING ((deleted_at IS NULL AND is_published) OR public.has_any_staff_role());

DROP POLICY product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_id
  AND ((p.deleted_at IS NULL AND p.is_published) OR public.has_any_staff_role())
));

DROP POLICY reviews_public_read_approved ON public.reviews;
CREATE POLICY reviews_public_read_approved ON public.reviews FOR SELECT TO anon, authenticated
USING ((is_approved AND EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_id
  AND p.deleted_at IS NULL AND p.is_published
)) OR user_id = auth.uid() OR public.has_any_staff_role());

CREATE FUNCTION public.admin_create_published_product(
  p_name text, p_slug text, p_description text, p_condition text,
  p_brand_id uuid, p_category_id uuid, p_sku text,
  p_price integer, p_is_serialized boolean, p_is_published boolean,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_product_id uuid;
BEGIN
  new_product_id := public.admin_create_catalogue_product(
    p_name,p_slug,p_description,p_condition,p_brand_id,p_category_id,
    p_sku,p_price,p_is_serialized,p_actor_id
  );
  UPDATE public.products SET is_published = p_is_published WHERE id = new_product_id;
  RETURN new_product_id;
END;
$$;

CREATE FUNCTION public.admin_update_published_product(
  p_product_id uuid, p_variant_id uuid, p_name text, p_description text,
  p_price integer, p_is_published boolean, p_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_update_product(p_product_id,p_variant_id,p_name,p_description,p_price,p_actor_id);
  UPDATE public.products SET is_published = p_is_published WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_published_product(text,text,text,text,uuid,uuid,text,integer,boolean,boolean,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_published_product(uuid,uuid,text,text,integer,boolean,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_published_product(text,text,text,text,uuid,uuid,text,integer,boolean,boolean,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_published_product(uuid,uuid,text,text,integer,boolean,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_create_catalogue_product(text,text,text,text,uuid,uuid,text,integer,boolean,uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.admin_update_product(uuid,uuid,text,text,integer,uuid) FROM service_role;
