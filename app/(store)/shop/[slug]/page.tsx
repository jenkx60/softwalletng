import Link from "next/link";
import { AddToBasket } from "@/components/CustomerBasket";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PriceDisplay } from "@/components/PriceDisplay";
import { ConditionTag } from "@/components/ConditionTag";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { LiveProductPhoto } from "@/components/LiveProductPhoto";

export default async function ShopProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const env = getSupabasePublicEnv();
  if (!env) notFound();

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: product, error } = await supabase
    .from("products")
    .select("id,name,description,condition,brand_id,category_id,product_variants(id,storage,color,price),reviews(rating,body,is_approved),product_images(storage_path,alt_text,sort_order)")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();
  if (error || !product) notFound();
  const photos = product.product_images.sort((a, b) => a.sort_order - b.sort_order);

  const brand=product.brand_id?(await supabase.from("brands").select("name").eq("id",product.brand_id).single()).data:null;
  const category=product.category_id?(await supabase.from("categories").select("name").eq("id",product.category_id).single()).data:null;
  return (
    <>
      <SiteHeader variant="breadcrumb" breadcrumb={product.name} />
      <main className="page-container flex-1 py-10">
        <Link href="/shop" className="text-sm text-blue">← Back to shop</Link>
        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="space-y-4"><LiveProductPhoto path={photos[0]?.storage_path} alt={photos[0]?.alt_text || product.name} fallback={product.name} priority />{photos.length>1&&<div className="grid grid-cols-2 gap-3">{photos.slice(1).map(photo=><LiveProductPhoto key={photo.storage_path} path={photo.storage_path} alt={photo.alt_text||product.name} fallback={product.name}/>)}</div>}</div>
          <div>
            <p className="text-sm text-ink-45">{[brand?.name,category?.name].filter(Boolean).join(" · ")}</p>
            <ConditionTag variant={product.condition === "uk_used" ? "used" : "new"} />
            <h1 className="mt-4 text-3xl font-semibold">{product.name}</h1>
            {product.description && <p className="mt-4 text-ink-70">{product.description}</p>}
            <h2 className="mt-8 mb-3 text-sm font-semibold">Available configurations</h2>
            {product.product_variants.length ? (
              <div className="space-y-2">
                {product.product_variants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between rounded-xl border border-line bg-panel p-4 text-sm">
                    <span>{[variant.storage, variant.color].filter(Boolean).join(" · ") || "Standard"}</span>
                    <div><PriceDisplay kobo={variant.price} /><AddToBasket variantId={variant.id} price={variant.price} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-ink-45">No configurations listed yet.</p>}
            <p className="mt-6 text-sm text-ink-45">Stock is checked when you add to your basket and held when you begin payment.</p>
            {product.reviews.some((review) => review.is_approved) && <section className="mt-8"><h2 className="mb-3 font-semibold">Customer reviews</h2>{product.reviews.filter((review) => review.is_approved).map((review, index) => <div key={index} className="border-t border-line py-3 text-sm"><div className="font-medium">{review.rating} / 5</div><p className="mt-1 text-ink-70">{review.body}</p></div>)}</section>}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
