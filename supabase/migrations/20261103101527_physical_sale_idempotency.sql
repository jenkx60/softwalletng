CREATE TABLE public.physical_sale_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX physical_sale_requests_actor_id_idx ON public.physical_sale_requests(actor_id);
ALTER TABLE public.physical_sale_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY physical_sale_requests_staff_read ON public.physical_sale_requests
  FOR SELECT TO authenticated USING (public.has_any_staff_role());

CREATE FUNCTION public.admin_record_physical_sale_once(
  p_idempotency_key uuid, p_inventory_item_id uuid, p_variant_id uuid,
  p_quantity integer, p_actor_id uuid, p_notes text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_order_id uuid;
  existing_actor_id uuid;
  new_order_id uuid;
BEGIN
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Idempotency key required'; END IF;
  -- Same key serializes retries before stock is checked, including concurrent clicks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  SELECT order_id, actor_id INTO existing_order_id, existing_actor_id FROM public.physical_sale_requests
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing_actor_id <> p_actor_id THEN RAISE EXCEPTION 'Idempotency key belongs to another actor'; END IF;
    RETURN existing_order_id;
  END IF;

  new_order_id := public.admin_record_physical_sale(
    p_inventory_item_id, p_variant_id, p_quantity, p_actor_id, p_notes
  );
  INSERT INTO public.physical_sale_requests (idempotency_key, order_id, actor_id)
  VALUES (p_idempotency_key, new_order_id, p_actor_id);
  RETURN new_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_physical_sale_once(uuid,uuid,uuid,integer,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_physical_sale_once(uuid,uuid,uuid,integer,uuid,text)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_record_physical_sale(uuid,uuid,integer,uuid,text)
  FROM service_role;
