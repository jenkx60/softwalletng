"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDiscount, createDeliveryZone, assignStaffRole, saveSettings, updateProduct, updateTaxonomy } from "@/app/admin/actions";

export type Kind = "discount" | "delivery" | "staff" | "settings" | "product" | "category" | "brand";
type Product = { id: string; variantId: string; name: string; description: string; priceNaira: number; isPublished: boolean };
type Settings = { store_name: string; location: string; support_email: string; stock_alert_threshold: number };

const actions = { discount: createDiscount, delivery: createDeliveryZone, staff: assignStaffRole, settings: saveSettings, product: updateProduct, category: updateTaxonomy, brand: updateTaxonomy };

export function AdminManageForm({ kind, users = [], settings, product, taxonomy }: { kind: Kind; users?: { id: string; label: string }[]; settings?: Settings; product?: Product; taxonomy?: { id: string; name: string } }) {
  const [state, action, pending] = useActionState(actions[kind], null);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.push(state.data.href); }, [state, router]);
  const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm";
  return <form action={action} className="mt-6 max-w-2xl space-y-4 rounded-xl border border-line bg-panel p-6">
    {kind === "discount" && <>
      <label className="block text-sm font-medium">Code<input required name="code" className={field} /></label>
      <label className="block text-sm font-medium">Type<select name="type" className={field}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
      <label className="block text-sm font-medium">Value (percent or ₦)<input required name="value" type="number" min="1" className={field} /></label>
      <label className="block text-sm font-medium">Minimum order (₦)<input name="minAmount" type="number" min="0" defaultValue="0" className={field} /></label>
    </>}
    {kind === "delivery" && <>
      <label className="block text-sm font-medium">Zone name<input required name="name" className={field} /></label>
      <label className="block text-sm font-medium">State<input required name="state" className={field} /></label>
      <label className="block text-sm font-medium">Delivery fee (₦)<input required name="feeNaira" type="number" min="0" className={field} /></label>
    </>}
    {kind === "staff" && <>
      <label className="block text-sm font-medium">User<select required name="userId" className={field}><option value="">Choose user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</select></label>
      <label className="block text-sm font-medium">Role<select required name="role" className={field}><option value="sales_staff">Sales staff</option><option value="inventory_manager">Inventory manager</option><option value="order_manager">Order manager</option><option value="super_admin">Super admin</option></select></label>
    </>}
    {kind === "settings" && <>
      <label className="block text-sm font-medium">Store name<input required name="storeName" defaultValue={settings?.store_name} className={field} /></label>
      <label className="block text-sm font-medium">Location<input required name="location" defaultValue={settings?.location} className={field} /></label>
      <label className="block text-sm font-medium">Support email<input required type="email" name="supportEmail" defaultValue={settings?.support_email} className={field} /></label>
      <label className="block text-sm font-medium">Low-stock alert threshold<input required type="number" min="0" name="threshold" defaultValue={settings?.stock_alert_threshold} className={field} /></label>
    </>}
    {kind === "product" && product && <>
      <input type="hidden" name="productId" value={product.id} /><input type="hidden" name="variantId" value={product.variantId} />
      <label className="block text-sm font-medium">Product name<input required name="name" defaultValue={product.name} className={field} /></label>
      <label className="block text-sm font-medium">Description<textarea name="description" defaultValue={product.description} rows={5} className={field} /></label>
      <label className="block text-sm font-medium">Variant price (₦)<input required type="number" min="0" name="priceNaira" defaultValue={product.priceNaira} className={field} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={product.isPublished} /> Publish to storefront</label>
    </>}
    {(kind === "category" || kind === "brand") && taxonomy && <><input type="hidden" name="kind" value={kind} /><input type="hidden" name="recordId" value={taxonomy.id} /><label className="block text-sm font-medium">Name<input required name="name" defaultValue={taxonomy.name} className={field} /></label></>}
    {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
    <button disabled={pending || (kind === "staff" && !users.length)} className="bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
  </form>;
}
