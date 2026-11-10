import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Clock,
  Gamepad2,
  Headphones,
  Laptop,
  Package,
  Smartphone,
} from "lucide-react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ProductCard } from "@/components/ProductCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TickerBar } from "@/components/TickerBar";
import { categories, recentlyListed, tickerItems } from "@/lib/mock/catalogue";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";
import { PriceDisplay } from "@/components/PriceDisplay";
import { ConditionTag } from "@/components/ConditionTag";
import { LiveProductPhoto } from "@/components/LiveProductPhoto";

const categoryIcons = {
  phones: Smartphone,
  laptops: Laptop,
  gaming: Gamepad2,
  audio: Headphones,
  accessories: Package,
  other: Clock,
};

export default async function HomePage({searchParams}:{searchParams:Promise<{code?:string}>}) {
  const {code}=await searchParams;
  // Supabase falls back to Site URL when a callback URL is not allow-listed.
  if(code)redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  const env = getSupabasePublicEnv();
  const supabase = env ? createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const { data: liveProducts } = supabase ? await supabase.from("products").select("id,slug,name,condition,product_variants(price),product_images(storage_path,alt_text,sort_order)").is("deleted_at", null).order("created_at", { ascending: false }).limit(4) : { data: null };
  const { data: liveCategories } = supabase ? await supabase.from("categories").select("name,slug").is("deleted_at", null).order("name") : { data: null };
  return (
    <>
      {!env && <TickerBar items={tickerItems} />}
      <SiteHeader />
      <div className="page-container">
        <HeroCarousel live={Boolean(env)} />
      </div>
      <section className="border-t border-line py-9">
        <div className="page-container">
          <h2 className="mb-[18px] text-xl font-semibold">Shop by category</h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {(env ? (liveCategories ?? []) : categories).map((category) => {
              const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] ?? Clock;
              return (
                <Link
                  key={category.slug}
                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                  className="rounded-xl border border-line bg-panel px-3.5 py-5 text-center"
                >
                  <Icon className="mx-auto mb-2.5 size-[26px] text-blue" />
                  <span className="text-[12.5px] font-medium">{category.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="pt-9 pb-[60px]">
        <div className="page-container">
          <div className="mb-[18px] flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Recently listed</h2>
            <Link href="/shop" className="text-[13px] font-medium text-blue">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-[18px] md:grid-cols-4">
            {env ? (liveProducts ?? []).map((product) => {
              const cover = product.product_images.sort((a, b) => a.sort_order - b.sort_order)[0];
              return <Link key={product.id} href={`/shop/${product.slug}`} className="rounded-xl border border-line bg-panel p-4"><div className="mb-4"><LiveProductPhoto path={cover?.storage_path} alt={cover?.alt_text || product.name} fallback={product.name} /></div><ConditionTag variant={product.condition === "uk_used" ? "used" : "new"} size="sm" /><div className="mt-3 mb-2 text-sm font-semibold">{product.name}</div>{product.product_variants.length > 0 && <PriceDisplay kobo={Math.min(...product.product_variants.map((variant) => variant.price))} />}</Link>;
            }) : recentlyListed.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
