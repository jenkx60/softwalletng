-- Preserve receipts before allowing customers to remove saved addresses.
UPDATE public.orders o
SET address_snapshot = to_jsonb(a) - 'user_id'
FROM public.addresses a
WHERE o.address_id = a.id AND o.address_snapshot IS NULL;

ALTER TABLE public.orders DROP CONSTRAINT orders_address_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_address_id_fkey
  FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
