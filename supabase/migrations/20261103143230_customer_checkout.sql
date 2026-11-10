-- Online holds are separate from physical unit status: sale is available -> sold only.
ALTER TABLE public.orders ADD COLUMN address_snapshot jsonb, ADD COLUMN payment_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD COLUMN checkout_url text;
CREATE TABLE public.checkout_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id),
 variant_id uuid NOT NULL REFERENCES public.product_variants(id),
 inventory_item_id uuid REFERENCES public.inventory_items(id),
 quantity integer NOT NULL CHECK(quantity > 0),
 expires_at timestamptz NOT NULL,
 released_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(inventory_item_id IS NULL OR quantity = 1)
);
CREATE INDEX checkout_holds_order_idx ON public.checkout_holds(order_id);
CREATE INDEX checkout_holds_variant_idx ON public.checkout_holds(variant_id,expires_at) WHERE released_at IS NULL;
CREATE INDEX checkout_holds_item_idx ON public.checkout_holds(inventory_item_id,expires_at) WHERE released_at IS NULL;
ALTER TABLE public.checkout_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY holds_owner_read ON public.checkout_holds FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.user_id=auth.uid() OR public.has_any_staff_role())));

-- Customer writes go through validated server actions; clients cannot forge prices or approval.
DROP POLICY orders_own_insert ON public.orders;
DROP POLICY order_items_own_insert ON public.order_items;
DROP POLICY reviews_own_insert ON public.reviews;
DROP POLICY reviews_own_update ON public.reviews;
DROP POLICY inventory_items_inventory_write ON public.inventory_items;

CREATE TABLE public.customer_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 order_id uuid REFERENCES public.orders(id),
 kind text NOT NULL CHECK(kind IN ('support','cancellation','return','restock')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 2 AND 160),
 message text NOT NULL CHECK(length(message) BETWEEN 2 AND 5000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
 response text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_requests_user_idx ON public.customer_requests(user_id);
CREATE INDEX customer_requests_order_idx ON public.customer_requests(order_id);
CREATE TRIGGER customer_requests_updated BEFORE UPDATE ON public.customer_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY requests_owner_read ON public.customer_requests FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role('order_manager') OR public.has_role('super_admin'));

CREATE OR REPLACE FUNCTION public.enforce_inventory_sale_transition() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('sold','reserved') AND OLD.status <> 'available' THEN
  RAISE EXCEPTION 'Inventory can only be sold or reserved from available';
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND EXISTS(SELECT 1 FROM public.checkout_holds WHERE inventory_item_id=OLD.id AND released_at IS NULL AND expires_at>now()) THEN
  RAISE EXCEPTION 'Unit is held for an online checkout';
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.protect_quantity_holds() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.quantity < OLD.quantity AND NEW.quantity < (SELECT coalesce(sum(quantity),0) FROM public.checkout_holds WHERE variant_id=OLD.id AND inventory_item_id IS NULL AND released_at IS NULL AND expires_at>now()) THEN
  RAISE EXCEPTION 'Quantity is held for online checkout';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER quantity_holds BEFORE UPDATE OF quantity ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.protect_quantity_holds();

CREATE FUNCTION public.begin_customer_checkout(p_user uuid,p_key uuid,p_lines jsonb,p_address uuid,p_zone uuid,p_code text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o uuid; v public.product_variants; p public.products; a public.addresses; z public.delivery_zones; d public.discounts; line jsonb; n integer; unit_id uuid; sub bigint:=0; discount_value bigint:=0; held integer; expiry timestamptz:=now()+interval '20 minutes';
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 SELECT id INTO o FROM public.orders WHERE idempotency_key=p_key::text AND user_id=p_user;
 IF FOUND THEN RETURN o; END IF;
 IF jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Invalid basket'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p_lines)) <> (SELECT count(DISTINCT x->>'variantId') FROM jsonb_array_elements(p_lines) x) THEN RAISE EXCEPTION 'Duplicate basket variants'; END IF;
 SELECT * INTO a FROM public.addresses WHERE id=p_address AND user_id=p_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose your delivery address'; END IF;
 SELECT * INTO z FROM public.delivery_zones WHERE id=p_zone AND is_active AND lower(state)=lower(a.state);
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery is unavailable for this address'; END IF;
 o:=gen_random_uuid();
 INSERT INTO public.orders(id,order_number,user_id,idempotency_key,subtotal_amount,total_amount,address_id,delivery_zone_id,address_snapshot)
 VALUES(o,'SW-'||upper(substr(replace(o::text,'-',''),1,12)),p_user,p_key::text,0,0,a.id,z.id,to_jsonb(a)-'user_id');
 FOR line IN SELECT value FROM jsonb_array_elements(p_lines) ORDER BY value->>'variantId' LOOP
  n:=(line->>'quantity')::integer;
  IF n NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid basket quantity'; END IF;
  SELECT * INTO v FROM public.product_variants WHERE id=(line->>'variantId')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product configuration no longer exists'; END IF;
  SELECT * INTO p FROM public.products WHERE id=v.product_id AND deleted_at IS NULL AND is_published;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is unavailable'; END IF;
  -- Repricing needs explicit customer acceptance before creating a payment.
  IF v.price IS DISTINCT FROM (line->>'expectedPrice')::integer THEN RAISE EXCEPTION 'Prices changed. Refresh your basket and review the total'; END IF;
  sub:=sub+v.price::bigint*n;
  IF v.is_serialized THEN
   FOR i IN 1..n LOOP
    SELECT id INTO unit_id FROM public.inventory_items item WHERE variant_id=v.id AND status='available' AND NOT EXISTS(SELECT 1 FROM public.checkout_holds h WHERE h.inventory_item_id=item.id AND released_at IS NULL AND expires_at>now()) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'A device in your basket is no longer available'; END IF;
    INSERT INTO public.checkout_holds(order_id,variant_id,inventory_item_id,quantity,expires_at) VALUES(o,v.id,unit_id,1,expiry);
    INSERT INTO public.order_items(order_id,variant_id,inventory_item_id,product_name,variant_label,unit_price,quantity) VALUES(o,v.id,unit_id,p.name,concat_ws(' · ',v.storage,v.color),v.price,1);
    INSERT INTO public.inventory_movements(variant_id,inventory_item_id,previous_quantity,change,new_quantity,reason,actor_id,reference_type,reference_id) VALUES(v.id,unit_id,1,-1,0,'checkout_hold',p_user,'order',o);
   END LOOP;
  ELSE
   SELECT coalesce(sum(quantity),0) INTO held FROM public.checkout_holds WHERE variant_id=v.id AND released_at IS NULL AND expires_at>now();
   IF v.quantity-held<n THEN RAISE EXCEPTION 'Insufficient stock. Review your basket'; END IF;
   INSERT INTO public.checkout_holds(order_id,variant_id,quantity,expires_at) VALUES(o,v.id,n,expiry);
   INSERT INTO public.order_items(order_id,variant_id,product_name,variant_label,unit_price,quantity) VALUES(o,v.id,p.name,concat_ws(' · ',v.storage,v.color),v.price,n);
   INSERT INTO public.inventory_movements(variant_id,previous_quantity,change,new_quantity,reason,actor_id,reference_type,reference_id) VALUES(v.id,v.quantity-held,-n,v.quantity-held-n,'checkout_hold',p_user,'order',o);
  END IF;
 END LOOP;
 IF nullif(trim(p_code),'') IS NOT NULL THEN
  SELECT * INTO d FROM public.discounts WHERE code=upper(trim(p_code)) AND is_active AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) FOR SHARE;
  IF NOT FOUND OR sub<coalesce(d.min_amount,0) THEN RAISE EXCEPTION 'Discount is invalid, expired, or minimum order not met'; END IF;
  discount_value:=least(sub,CASE WHEN d.type='percent' THEN sub*least(d.value,100)/100 ELSE d.value END);
 END IF;
 IF sub+z.fee-discount_value>2147483647 OR sub>2147483647 THEN RAISE EXCEPTION 'Order amount exceeds supported limit'; END IF;
 UPDATE public.orders SET subtotal_amount=sub,discount_amount=discount_value,delivery_fee=z.fee,total_amount=sub-discount_value+z.fee,discount_id=d.id WHERE id=o;
 INSERT INTO public.payments(order_id,paystack_reference,amount) VALUES(o,'sw-'||o::text,sub-discount_value+z.fee);
 RETURN o;
END $$;

CREATE OR REPLACE FUNCTION public.fulfill_payment(p_reference text,p_amount_kobo integer) RETURNS TABLE(already_paid boolean,payment_id uuid,order_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pay public.payments; ord public.orders; h public.checkout_holds; v public.product_variants; item public.inventory_items;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE paystack_reference=p_reference FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
 IF pay.amount<>p_amount_kobo THEN RAISE EXCEPTION 'Payment amount mismatch'; END IF;
 IF pay.status='paid' THEN RETURN QUERY SELECT true,pay.id,pay.order_id; RETURN; END IF;
 SELECT * INTO ord FROM public.orders WHERE id=pay.order_id FOR UPDATE;
 IF ord.status<>'pending' OR NOT EXISTS(SELECT 1 FROM public.checkout_holds WHERE checkout_holds.order_id=ord.id) OR EXISTS(SELECT 1 FROM public.checkout_holds WHERE checkout_holds.order_id=ord.id AND (released_at IS NOT NULL OR expires_at<=now())) THEN
  UPDATE public.payments SET status='paid' WHERE id=pay.id;
  UPDATE public.orders SET payment_review=true WHERE id=ord.id;
  RETURN QUERY SELECT false,pay.id,pay.order_id; RETURN;
 END IF;
 FOR h IN SELECT * FROM public.checkout_holds WHERE checkout_holds.order_id=ord.id ORDER BY variant_id,inventory_item_id LOOP
  SELECT * INTO v FROM public.product_variants WHERE id=h.variant_id FOR UPDATE;
  IF h.inventory_item_id IS NOT NULL THEN
   SELECT * INTO item FROM public.inventory_items WHERE id=h.inventory_item_id FOR UPDATE;
   IF item.status<>'available' THEN RAISE EXCEPTION 'Held device is unavailable'; END IF;
  END IF;
  UPDATE public.checkout_holds SET released_at=now() WHERE id=h.id;
  IF h.inventory_item_id IS NOT NULL THEN
   UPDATE public.inventory_items SET status='sold' WHERE id=item.id;
  ELSE
   UPDATE public.product_variants SET quantity=quantity-h.quantity WHERE id=v.id;
  END IF;
  INSERT INTO public.inventory_movements(variant_id,inventory_item_id,previous_quantity,change,new_quantity,reason,actor_id,reference_type,reference_id) VALUES(v.id,h.inventory_item_id,0,0,0,'checkout_fulfillment',ord.user_id,'payment',pay.id);
 END LOOP;
 UPDATE public.payments SET status='paid' WHERE id=pay.id;
 UPDATE public.orders SET status='paid' WHERE id=ord.id;
 RETURN QUERY SELECT false,pay.id,pay.order_id;
END $$;
REVOKE ALL ON FUNCTION public.begin_customer_checkout(uuid,uuid,jsonb,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_customer_checkout(uuid,uuid,jsonb,uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.protect_quantity_holds() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.release_customer_checkout(p_order uuid,p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; h public.checkout_holds;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR o.status<>'pending' OR o.payment_review THEN RAISE EXCEPTION 'Order cannot be cancelled'; END IF;
 FOR h IN SELECT * FROM public.checkout_holds WHERE order_id=o.id AND released_at IS NULL ORDER BY variant_id,inventory_item_id LOOP
  PERFORM 1 FROM public.product_variants WHERE id=h.variant_id FOR UPDATE;
  IF h.inventory_item_id IS NOT NULL THEN PERFORM 1 FROM public.inventory_items WHERE id=h.inventory_item_id FOR UPDATE; END IF;
  UPDATE public.checkout_holds SET released_at=now() WHERE id=h.id;
  INSERT INTO public.inventory_movements(variant_id,inventory_item_id,previous_quantity,change,new_quantity,reason,actor_id,reference_type,reference_id) VALUES(h.variant_id,h.inventory_item_id,0,h.quantity,h.quantity,'checkout_release',p_user,'order',o.id);
 END LOOP;
 UPDATE public.orders SET status='cancelled' WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION public.release_customer_checkout(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_customer_checkout(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_record_physical_sale(
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
    SELECT * INTO item_row FROM public.inventory_items WHERE id = p_inventory_item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unit is no longer available'; END IF;
    SELECT * INTO variant_row FROM public.product_variants WHERE id = item_row.variant_id FOR UPDATE;
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

