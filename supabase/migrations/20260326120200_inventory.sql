-- Serialized units and append-only stock movements. A unit may only
-- enter reserved from available, and sold from available or reserved
-- (reserved → sold is required to finalize an online reservation).

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  imei text,
  serial_number text,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN (
      'available',
      'reserved',
      'sold',
      'damaged',
      'returned',
      'trade_in_pending',
      'removed'
    )),
  condition_grade text,
  battery_health integer CHECK (
    battery_health IS NULL OR (battery_health >= 0 AND battery_health <= 100)
  ),
  cost_price integer CHECK (cost_price IS NULL OR cost_price >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_items_variant_status_idx
  ON public.inventory_items (variant_id, status);

CREATE UNIQUE INDEX inventory_items_imei_uidx
  ON public.inventory_items (imei)
  WHERE imei IS NOT NULL;

CREATE UNIQUE INDEX inventory_items_serial_uidx
  ON public.inventory_items (serial_number)
  WHERE serial_number IS NOT NULL;

CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_inventory_sale_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'reserved' AND OLD.status <> 'available' THEN
      RAISE EXCEPTION
        'inventory item % can only move to reserved from available (was %)',
        NEW.id, OLD.status;
    END IF;

    -- sold is allowed from available (in-store) or reserved (online fulfill)
    IF NEW.status = 'sold' AND OLD.status NOT IN ('available', 'reserved') THEN
      RAISE EXCEPTION
        'inventory item % can only move to sold from available or reserved (was %)',
        NEW.id, OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_items_sale_transition
  BEFORE UPDATE OF status ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_inventory_sale_transition();

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  inventory_item_id uuid REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  previous_quantity integer NOT NULL,
  change integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text NOT NULL,
  actor_id uuid REFERENCES public.profiles (id),
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_movements_variant_id_idx
  ON public.inventory_movements (variant_id);
CREATE INDEX inventory_movements_inventory_item_id_idx
  ON public.inventory_movements (inventory_item_id);
CREATE INDEX inventory_movements_actor_id_idx
  ON public.inventory_movements (actor_id);
CREATE INDEX inventory_movements_reference_idx
  ON public.inventory_movements (reference_type, reference_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_items_staff_read
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (public.has_any_staff_role());

CREATE POLICY inventory_items_inventory_write
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  )
  WITH CHECK (
    public.has_role('inventory_manager')
    OR public.has_role('super_admin')
  );

CREATE POLICY inventory_movements_staff_read
  ON public.inventory_movements
  FOR SELECT
  TO authenticated
  USING (public.has_any_staff_role());

-- Append-only: no UPDATE or DELETE policies for any role.
CREATE POLICY inventory_movements_no_client_insert
  ON public.inventory_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
