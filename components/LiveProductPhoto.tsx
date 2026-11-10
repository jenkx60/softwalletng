import Image from "next/image";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function LiveProductPhoto({ path, alt, fallback, priority = false }: { path?: string | null; alt: string; fallback: string; priority?: boolean }) {
  const env = getSupabasePublicEnv();
  if (!env || !path) return <div className="flex aspect-square items-center justify-center rounded-lg bg-photo text-sm text-ink-45">{fallback}</div>;
  const src = `${env.url}/storage/v1/object/public/product-photos/${path.split("/").map(encodeURIComponent).join("/")}`;
  return <div className="relative aspect-square overflow-hidden rounded-lg bg-photo"><Image src={src} alt={alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain" priority={priority} /></div>;
}
