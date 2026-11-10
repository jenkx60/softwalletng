-- Supabase grants EXECUTE to API roles explicitly. Revoking only PUBLIC in
-- the initial migration left these security-definer RPCs callable by clients.
REVOKE EXECUTE ON FUNCTION public.reserve_inventory_item(uuid, uuid, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_inventory_item(uuid, uuid, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_variant_quantity(uuid, integer, text, uuid, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_physical_sale(uuid, uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.enforce_inventory_sale_transition() SET search_path = public;
