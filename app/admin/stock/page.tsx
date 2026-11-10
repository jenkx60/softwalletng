import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SerializedIntakeForm, QuantityIntakeForm } from "@/components/AdminStockForms";

export default async function StockIntakePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("product_variants").select("id,sku,is_serialized").order("sku");
  const serialized = (data ?? []).filter((row) => row.is_serialized).map((row) => ({ id: row.id, label: row.sku }));
  const quantity = (data ?? []).filter((row) => !row.is_serialized).map((row) => ({ id: row.id, label: row.sku }));
  return <main className="px-4 py-6 md:px-8 md:py-8"><h1 className="text-2xl font-semibold">Receive stock</h1><p className="mt-2 mb-6 text-sm text-ink-70">Every intake writes a stock movement.</p><div className="grid gap-5 lg:grid-cols-2"><SerializedIntakeForm variants={serialized} /><QuantityIntakeForm variants={quantity} /></div></main>;
}
