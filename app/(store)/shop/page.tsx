import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PriceDisplay } from "@/components/PriceDisplay";
import { ConditionTag } from "@/components/ConditionTag";
import { LiveProductPhoto } from "@/components/LiveProductPhoto";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export default async function ShopPage({searchParams}:{searchParams:Promise<{q?:string;category?:string;brand?:string;condition?:string;sort?:string;page?:string}>}){
 const search=await searchParams;const env=getSupabasePublicEnv();
 const page=Math.max(1,Math.min(1000,Number.parseInt(search.page??"1",10)||1));
 const db=env?createClient(env.url,env.anonKey,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 const categories=db?(await db.from("categories").select("id,name,slug").is("deleted_at",null).order("name")).data??[]:[];
 const brands=db?(await db.from("brands").select("id,name").order("name")).data??[]:[];
 let query=db?.from("storefront_products").select("id,name,slug,condition,minimum_price,photo",{count:"exact"});
 if(search.q)query=query?.ilike("name",`%${search.q.replace(/[%_]/g,"").slice(0,100)}%`);
 const category=categories.find(c=>c.slug===search.category);
 if(category)query=query?.eq("category_id",category.id);
 if(search.brand&&brands.some(b=>b.id===search.brand))query=query?.eq("brand_id",search.brand);
 if(["new","uk_used"].includes(search.condition??""))query=query?.eq("condition",search.condition);
 query=query?.order(search.sort==="price-low"||search.sort==="price-high"?"minimum_price":"created_at",{ascending:search.sort==="price-low",nullsFirst:false}).order("id").range((page-1)*24,page*24-1);
 const result=query?await query:null;const products=result?.data??[];
 function pageLink(next:number){const params=new URLSearchParams();for(const [key,value] of Object.entries(search))if(value)params.set(key,value);params.set("page",String(next));return `/shop?${params}`;}
 return <><SiteHeader /><main className="page-container flex-1 py-9"><p className="mb-2 text-xs font-semibold tracking-widest text-blue uppercase">Softwallet / Discover & choose</p><h1 className="mb-6 text-3xl font-semibold">Find your next device</h1><form action="/shop" className="mb-7 grid gap-3 rounded-xl border border-line bg-panel p-4 md:grid-cols-3 lg:grid-cols-6"><input name="q" aria-label="Search products" placeholder="Search devices…" defaultValue={search.q} className="border border-line p-3 text-sm md:col-span-2"/><select name="category" aria-label="Category" defaultValue={search.category??""} className="border border-line p-3 text-sm"><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select><select name="brand" aria-label="Brand" defaultValue={search.brand??""} className="border border-line p-3 text-sm"><option value="">All brands</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select name="condition" aria-label="Condition" defaultValue={search.condition??""} className="border border-line p-3 text-sm"><option value="">Any condition</option><option value="new">New</option><option value="uk_used">UK-used</option></select><select name="sort" aria-label="Sort products" defaultValue={search.sort??"latest"} className="border border-line p-3 text-sm"><option value="latest">Recently listed</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><button className="bg-ink px-5 py-3 text-sm font-semibold text-white">Apply filters</button><Link href="/shop" className="self-center text-sm text-blue">Clear filters</Link></form>{!result||result.error?<div role="alert" className="rounded-xl border border-line bg-panel p-6">The catalogue could not be loaded. <Link href="/shop" className="text-blue">Try again</Link></div>:!products.length?<div className="rounded-xl border border-line bg-panel p-8"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-2 text-sm text-ink-70">Try a different search or remove a filter.</p><Link href="/shop" className="mt-4 inline-block text-blue">Browse all devices</Link></div>:<><p className="mb-4 text-sm text-ink-70">{result.count} products</p><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{products.map(p=><Link key={p.id} href={`/shop/${p.slug}`} className="rounded-xl border border-line bg-panel p-4 transition-shadow hover:shadow-soft"><LiveProductPhoto path={p.photo} alt={p.name} fallback={p.name}/><div className="mt-4"><ConditionTag variant={p.condition==="uk_used"?"used":"new"} size="sm"/><h2 className="mt-3 mb-2 text-sm font-semibold">{p.name}</h2>{p.minimum_price!==null&&<PriceDisplay kobo={p.minimum_price}/>}</div></Link>)}</div><nav aria-label="Catalogue pages" className="mt-7 flex justify-between text-sm text-blue">{page>1?<Link href={pageLink(page-1)}>← Previous</Link>:<span/>}{page*24<(result.count??0)&&<Link href={pageLink(page+1)}>Next →</Link>}</nav></>}</main><SiteFooter /></>;
}
