"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCatalogueRecord } from "@/app/admin/actions";
import { CompressedProductImages, type ImageInputStatus } from "@/components/CompressedProductImages";

type Option = { id: string; name: string };

export function AdminCatalogueForm({ kind, brands, categories }: { kind: "product" | "category" | "brand"; brands: Option[]; categories: Option[] }) {
  const [state, action, pending] = useActionState(createCatalogueRecord, null);
  const [imageStatus, setImageStatus] = useState<ImageInputStatus>("idle");
  const router = useRouter();
  useEffect(() => { 
    if (state?.success) 
      router.push(state.data.href); 
    }, 
    
    [state, router]);

  const field = "w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm";

  return (
    <form action={action} className="mt-7 max-w-2xl space-y-4 rounded-xl border border-line bg-panel p-6">
      <input 
        type="hidden" 
        name="kind" 
        value={kind} 
      />

      <label className="block text-sm font-medium">
        Product Name
        <input required name="name" className={`mt-1 ${field}`} />
        {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      </label>
      <label className="block text-sm font-medium">
        Slug
        <input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="lowercase-with-hyphens" className={`mt-1 ${field}`} />
        {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      </label>

      {kind === "product" && 
      <>
        <label className="block text-sm font-medium">
          Product Description
          <textarea name="description" rows={4} className={`mt-1 ${field}`} />
          {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Condition
            <select name="condition" className={`mt-1 ${field}`}><option value="new">New</option><option value="uk_used">UK-used</option></select>
            {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
          </label>
          <label className="block text-sm font-medium">
            Price (₦)
            <input required type="number" min="0" step="1" name="priceNaira" className={`mt-1 ${field}`} />
            {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
          </label>
          <label className="block text-sm font-medium">
            Category
            <select required name="categoryId" className={`mt-1 ${field}`}><option value="">Choose category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
          </label>
          <label className="block text-sm font-medium">
            Brand
            <select required name="brandId" className={`mt-1 ${field}`}><option value="">Choose brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
          </label>
          <label className="block text-sm font-medium">
            SKU
            <input required name="sku" className={`mt-1 ${field}`} />
            {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
          </label>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isSerialized" defaultChecked /> Track individual units</label>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isPublished" defaultChecked /> Publish to storefront</label>
        </div>
        <p className="text-xs text-ink-45">Stock is received separately in Inventory. New products appear in the storefront immediately.</p>
        <div className="text-sm font-medium">
          Product images
          <CompressedProductImages name="photos" maxFiles={3} onStatusChange={setImageStatus} />
        </div>
      </>}
      {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      <button disabled={pending || imageStatus !== "idle" || (kind === "product" && (!brands.length || !categories.length))} className="bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : imageStatus === "processing" ? "Preparing images…" : imageStatus === "error" ? "Choose valid images" : `Add ${kind}`}</button>
    </form>
  );
}
