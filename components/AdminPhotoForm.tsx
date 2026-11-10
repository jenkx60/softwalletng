"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProductPhoto } from "@/app/admin/actions";
import { CompressedProductImages, type ImageInputStatus } from "@/components/CompressedProductImages";

export function AdminPhotoForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(uploadProductPhoto, null);
  const [imageStatus, setImageStatus] = useState<ImageInputStatus>("idle");
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return <form action={action} className="mt-6 max-w-2xl space-y-4 rounded-xl border border-line bg-panel p-6">
    <h2 className="font-semibold">Product photos</h2>
    <input type="hidden" name="productId" value={productId} />
    <div className="text-sm font-medium">Image<CompressedProductImages required name="photo" maxFiles={1} onStatusChange={setImageStatus} /></div>
    <label className="block text-sm font-medium">Description for accessibility<input name="altText" maxLength={160} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm" /></label>
    {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-green-700">Photo uploaded.</p>}
    <button disabled={pending || imageStatus !== "idle"} className="bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Uploading…" : imageStatus === "processing" ? "Preparing image…" : imageStatus === "error" ? "Choose a valid image" : "Upload photo"}</button>
  </form>;
}
