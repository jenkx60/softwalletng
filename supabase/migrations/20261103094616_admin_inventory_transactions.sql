CREATE FUNCTION public.admin_receive_serialized_unit(
  p_variant_id uuid, p_imei text, p_serial_number text,
  p_condition_grade text, p_battery_health integer, p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  variant_row public.product_variants;
  new_item_id uuid;
BEGIN
  SELECT * INTO variant_row FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND OR NOT variant_row.is_serialized THEN
    RAISE EXCEPTION 'Serialized variant not found';
  END IF;
  IF nullif(trim(coalesce(p_imei, '')), '') IS NULL
     AND nullif(trim(coalesce(p_serial_number, '')), '') IS NULL THEN
    RAISE EXCEPTION 'IMEI or serial number required';
  END IF;
  INSERT INTO public.inventory_items (variant_id, imei, serial_number, condition_grade, battery_health)
  VALUES (p_variant_id, nullif(trim(p_imei), ''), nullif(trim(p_serial_number), ''),
          nullif(trim(p_condition_grade), ''), p_battery_health)
  RETURNING id INTO new_item_id;
  INSERT INTO public.inventory_movements
    (variant_id, inventory_item_id, previous_quantity, change, new_quantity, reason, actor_id, reference_type, reference_id)
  VALUES (p_variant_id, new_item_id, 0, 1, 1, 'stock_intake', p_actor_id, 'inventory_item', new_item_id);
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (p_actor_id, 'stock_intake', 'inventory_item', new_item_id);
  RETURN new_item_id;
END;
$$;

CREATE FUNCTION public.admin_record_physical_sale(
  p_inventory_item_id uuid, p_variant_id uuid, p_quantity integer,
  p_actor_id uuid, p_notes text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  item_row public.inventory_items;
  variant_row public.product_variants;
  product_row public.products;
  new_order_id uuid := gen_random_uuid();
  sale_quantity integer;
BEGIN
  IF (p_inventory_item_id IS NULL) = (p_variant_id IS NULL) THEN
    RAISE EXCEPTION 'Select one inventory unit or one quantity variant';
  END IF;

  IF p_inventory_item_id IS NOT NULL THEN
    SELECT * INTO item_row FROM public.inventory_items WHERE id = p_inventory_item_id FOR UPDATE;
    IF NOT FOUND OR item_row.status <> 'available' THEN
      RAISE EXCEPTION 'Unit is no longer available';
    END IF;
    SELECT * INTO variant_row FROM public.product_variants WHERE id = item_row.variant_id FOR UPDATE;
    sale_quantity := 1;
  ELSE
    SELECT * INTO variant_row FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
    IF NOT FOUND OR variant_row.is_serialized OR p_quantity IS NULL OR p_quantity < 1
       OR variant_row.quantity < p_quantity THEN
      RAISE EXCEPTION 'Insufficient quantity or invalid variant';
    END IF;
    sale_quantity := p_quantity;
  END IF;

  IF variant_row.price::bigint * sale_quantity > 2147483647 THEN
    RAISE EXCEPTION 'Sale total exceeds supported amount';
  END IF;

  SELECT * INTO product_row FROM public.products WHERE id = variant_row.product_id;
  INSERT INTO public.orders
    (id, order_number, status, fulfillment_channel, idempotency_key,
     subtotal_amount, total_amount, notes)
  VALUES
    (new_order_id, 'SW-' || upper(substr(replace(new_order_id::text, '-', ''), 1, 12)),
     'paid', 'in_store', new_order_id::text,
     variant_row.price * sale_quantity, variant_row.price * sale_quantity, p_notes);
  INSERT INTO public.order_items
    (order_id, variant_id, inventory_item_id, product_name, variant_label, unit_price, quantity)
  VALUES
    (new_order_id, variant_row.id, p_inventory_item_id, product_row.name,
     concat_ws(' · ', variant_row.storage, variant_row.color), variant_row.price, sale_quantity);

  IF p_inventory_item_id IS NOT NULL THEN
    PERFORM public.record_physical_sale(p_inventory_item_id, p_actor_id, new_order_id);
  ELSE
    PERFORM public.adjust_variant_quantity(variant_row.id, -sale_quantity, 'physical_sale', p_actor_id, 'order', new_order_id);
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (p_actor_id, 'record_physical_sale', 'order', new_order_id);
  RETURN new_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_receive_serialized_unit(uuid,text,text,text,integer,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_record_physical_sale(uuid,uuid,integer,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_receive_serialized_unit(uuid,text,text,text,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_record_physical_sale(uuid,uuid,integer,uuid,text) TO service_role;
