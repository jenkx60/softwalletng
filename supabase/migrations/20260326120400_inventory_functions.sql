-- Locking inventory helpers and idempotent payment fulfillment.
-- Callable only by the service role. Each path locks rows with
-- SELECT ... FOR UPDATE before checking or changing status.

CREATE OR REPLACE FUNCTION public.reserve_inventory_item(
  p_item_id uuid,
  p_actor_id uuid,
  p_reference_type text,
  p_reference_id uuid
)
RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.inventory_items;
BEGIN
  -- lock this row before checking status — prevents double-sale race, see AGENTS.md §4.1
  SELECT * INTO item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item % not found', p_item_id;
  END IF;

  IF item.status <> 'available' THEN
    RAISE EXCEPTION 'inventory item % is not available (status %)', p_item_id, item.status;
  END IF;

  UPDATE public.inventory_items
  SET status = 'reserved'
  WHERE id = p_item_id
  RETURNING * INTO item;

  INSERT INTO public.inventory_movements (
    variant_id,
    inventory_item_id,
    previous_quantity,
    change,
    new_quantity,
    reason,
    actor_id,
    reference_type,
    reference_id
  ) VALUES (
    item.variant_id,
    item.id,
    1,
    -1,
    0,
    'reservation',
    p_actor_id,
    p_reference_type,
    p_reference_id
  );

  RETURN item;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_inventory_item(
  p_item_id uuid,
  p_actor_id uuid,
  p_reference_type text,
  p_reference_id uuid
)
RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.inventory_items;
BEGIN
  SELECT * INTO item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item % not found', p_item_id;
  END IF;

  IF item.status <> 'reserved' THEN
    RAISE EXCEPTION 'inventory item % is not reserved (status %)', p_item_id, item.status;
  END IF;

  UPDATE public.inventory_items
  SET status = 'available'
  WHERE id = p_item_id
  RETURNING * INTO item;

  INSERT INTO public.inventory_movements (
    variant_id,
    inventory_item_id,
    previous_quantity,
    change,
    new_quantity,
    reason,
    actor_id,
    reference_type,
    reference_id
  ) VALUES (
    item.variant_id,
    item.id,
    0,
    1,
    1,
    'release',
    p_actor_id,
    p_reference_type,
    p_reference_id
  );

  RETURN item;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_variant_quantity(
  p_variant_id uuid,
  p_delta integer,
  p_reason text,
  p_actor_id uuid,
  p_reference_type text,
  p_reference_id uuid
)
RETURNS public.product_variants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  variant public.product_variants;
  new_qty integer;
BEGIN
  SELECT * INTO variant
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant % not found', p_variant_id;
  END IF;

  IF variant.is_serialized THEN
    RAISE EXCEPTION 'variant % is serialized — adjust inventory_items instead', p_variant_id;
  END IF;

  new_qty := variant.quantity + p_delta;
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'variant % has insufficient quantity (% + %)', p_variant_id, variant.quantity, p_delta;
  END IF;

  UPDATE public.product_variants
  SET quantity = new_qty
  WHERE id = p_variant_id
  RETURNING * INTO variant;

  INSERT INTO public.inventory_movements (
    variant_id,
    previous_quantity,
    change,
    new_quantity,
    reason,
    actor_id,
    reference_type,
    reference_id
  ) VALUES (
    variant.id,
    variant.quantity - p_delta,
    p_delta,
    variant.quantity,
    p_reason,
    p_actor_id,
    p_reference_type,
    p_reference_id
  );

  RETURN variant;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_physical_sale(
  p_item_id uuid,
  p_actor_id uuid,
  p_reference_id uuid
)
RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.inventory_items;
BEGIN
  SELECT * INTO item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item % not found', p_item_id;
  END IF;

  IF item.status <> 'available' THEN
    RAISE EXCEPTION 'inventory item % is not available (status %)', p_item_id, item.status;
  END IF;

  UPDATE public.inventory_items
  SET status = 'sold'
  WHERE id = p_item_id
  RETURNING * INTO item;

  INSERT INTO public.inventory_movements (
    variant_id,
    inventory_item_id,
    previous_quantity,
    change,
    new_quantity,
    reason,
    actor_id,
    reference_type,
    reference_id
  ) VALUES (
    item.variant_id,
    item.id,
    1,
    -1,
    0,
    'physical_sale',
    p_actor_id,
    'order',
    p_reference_id
  );

  RETURN item;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_payment(
  p_reference text,
  p_amount_kobo integer
)
RETURNS TABLE (
  already_paid boolean,
  payment_id uuid,
  order_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment public.payments;
  order_row public.orders;
  item_row public.order_items;
  inv public.inventory_items;
BEGIN
  SELECT * INTO payment
  FROM public.payments
  WHERE paystack_reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment with reference % not found', p_reference;
  END IF;

  -- Idempotent: a second webhook delivery must be a no-op. AGENTS.md §4.2
  IF payment.status = 'paid' THEN
    RETURN QUERY SELECT true, payment.id, payment.order_id;
    RETURN;
  END IF;

  IF payment.amount <> p_amount_kobo THEN
    RAISE EXCEPTION
      'payment amount mismatch for %: expected %, got %',
      p_reference, payment.amount, p_amount_kobo;
  END IF;

  SELECT * INTO order_row
  FROM public.orders
  WHERE id = payment.order_id
  FOR UPDATE;

  UPDATE public.payments
  SET status = 'paid'
  WHERE id = payment.id;

  UPDATE public.orders
  SET status = 'paid'
  WHERE id = order_row.id;

  FOR item_row IN
    SELECT * FROM public.order_items WHERE order_items.order_id = order_row.id
  LOOP
    IF item_row.inventory_item_id IS NOT NULL THEN
      SELECT * INTO inv
      FROM public.inventory_items
      WHERE id = item_row.inventory_item_id
      FOR UPDATE;

      IF inv.status NOT IN ('reserved', 'available') THEN
        RAISE EXCEPTION
          'cannot fulfill item % in status %', inv.id, inv.status;
      END IF;

      UPDATE public.inventory_items
      SET status = 'sold'
      WHERE id = inv.id;

      INSERT INTO public.inventory_movements (
        variant_id,
        inventory_item_id,
        previous_quantity,
        change,
        new_quantity,
        reason,
        actor_id,
        reference_type,
        reference_id
      ) VALUES (
        inv.variant_id,
        inv.id,
        1,
        -1,
        0,
        'fulfillment',
        order_row.user_id,
        'payment',
        payment.id
      );
    END IF;
  END LOOP;

  RETURN QUERY SELECT false, payment.id, payment.order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_inventory_item(uuid, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_inventory_item(uuid, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_variant_quantity(uuid, integer, text, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_physical_sale(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_payment(text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reserve_inventory_item(uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_inventory_item(uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_variant_quantity(uuid, integer, text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_physical_sale(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(text, integer) TO service_role;
