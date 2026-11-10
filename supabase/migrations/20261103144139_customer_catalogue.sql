CREATE VIEW public.storefront_products WITH (security_invoker=true) AS
 SELECT p.id,p.name,p.slug,p.description,p.condition,p.brand_id,p.category_id,p.created_at,
 (SELECT min(v.price) FROM public.product_variants v WHERE v.product_id=p.id) AS minimum_price,
 (SELECT i.storage_path FROM public.product_images i WHERE i.product_id=p.id ORDER BY i.sort_order,i.created_at,i.id LIMIT 1) AS photo
 FROM public.products p WHERE p.is_published AND p.deleted_at IS NULL;
GRANT SELECT ON public.storefront_products TO anon,authenticated;
CREATE INDEX orders_discount_id_idx ON public.orders(discount_id);
CREATE INDEX cart_items_inventory_item_id_idx ON public.cart_items(inventory_item_id);
CREATE INDEX reviews_order_id_idx ON public.reviews(order_id);
