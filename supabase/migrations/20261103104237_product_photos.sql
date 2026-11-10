CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  storage_path text NOT NULL UNIQUE,
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$')
);

CREATE INDEX product_images_product_id_idx ON public.product_images(product_id, sort_order);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_images_public_read ON public.product_images FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_id
    AND p.deleted_at IS NULL AND p.is_published = true
) OR public.has_any_staff_role());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-photos', 'product-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY product_photos_public_read ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-photos' AND EXISTS (
  SELECT 1 FROM public.product_images image
  WHERE image.storage_path = name AND EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = image.product_id
      AND p.deleted_at IS NULL AND p.is_published = true
  )
));
