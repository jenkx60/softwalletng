import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SaleForm } from "@/components/AdminStockForms";

export default async function RecordSalePage() {
  const supabase = await createServerSupabaseClient();
  const [itemsResult, variantsResult] = await Promise.all([
    supabase.from("inventory_items").select("id,imei,serial_number,variant_id").eq("status", "available").order("created_at", { ascending: false }).limit(100),
    supabase.from("product_variants").select("id,sku,quantity").eq("is_serialized", false).gt("quantity", 0).order("sku"),
  ]);
  const items = (itemsResult.data ?? []).map((row) => ({ id: row.id, label: `${row.imei || row.serial_number || row.id} · ${row.variant_id.slice(0, 8)}` }));
  const variants = (variantsResult.data ?? []).map((row) => ({ id: row.id, label: `${row.sku} · ${row.quantity} available` }));
  return <main className="px-4 py-6 md:px-8 md:py-8"><h1 className="text-2xl font-semibold">Record physical sale</h1><p className="mt-2 mb-6 text-sm text-ink-70">Uses the same locked inventory as online reservations.</p><div className="grid gap-5 lg:grid-cols-2"><SaleForm kind="unit" items={items} variants={variants} /><SaleForm kind="quantity" items={items} variants={variants} /></div></main>;
}
