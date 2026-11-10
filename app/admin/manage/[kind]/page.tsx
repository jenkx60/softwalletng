import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminManageForm, type Kind } from "@/components/AdminManageForm";
import { AdminInviteForm } from "@/components/AdminInviteForm";
import { AdminPhotoForm } from "@/components/AdminPhotoForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ManagePage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ productId?: string; photoUpload?: string }> }) {
  const { kind } = await params;
  const { productId, photoUpload } = await searchParams;
  if (!["discount", "delivery", "staff", "settings", "product", "category", "brand"].includes(kind)) notFound();
  const supabase = await createServerSupabaseClient();
  let users: { id: string; label: string }[] = [];
  let settings: { store_name: string; location: string; support_email: string; stock_alert_threshold: number } | undefined;
  let product: { id: string; variantId: string; name: string; description: string; priceNaira: number; isPublished: boolean } | undefined;
  let taxonomy: { id: string; name: string } | undefined;
  if (kind === "staff") {
    const { data } = await supabase.from("profiles").select("id,full_name").order("created_at", { ascending: false });
    users = (data ?? []).map((row) => ({ id: row.id, label: row.full_name || row.id }));
  }
  if (kind === "settings") {
    const { data } = await supabase.from("store_settings").select("store_name,location,support_email,stock_alert_threshold").eq("singleton", true).single();
    settings = data ?? undefined;
  }
  if (kind === "product") {
    if (!productId) notFound();
    const { data } = await supabase.from("products").select("id,name,description,is_published,product_variants(id,price)").eq("id", productId).single();
    const variant = data?.product_variants?.[0];
    if (!data || !variant) notFound();
    product = { id: data.id, variantId: variant.id, name: data.name, description: data.description, priceNaira: variant.price / 100, isPublished: data.is_published };
  }
  if (kind === "category" || kind === "brand") {
    if (!productId) notFound();
    const { data } = await supabase.from(kind === "category" ? "categories" : "brands").select("id,name").eq("id", productId).single();
    if (!data) notFound();
    taxonomy = data;
  }
  const title = { discount: "Add discount", delivery: "Add delivery zone", staff: "Assign staff role", settings: "Edit settings", product: "Edit product", category: "Edit category", brand: "Edit brand" }[kind as Kind];
  return <main className="px-4 py-6 md:px-8 md:py-8"><Link href="/admin" className="text-sm text-blue">← Admin</Link><h1 className="mt-5 text-2xl font-semibold">{title}</h1>{photoUpload === "failed" && <p role="alert" className="mt-4 max-w-2xl rounded-lg border border-rust/30 bg-rust-tint p-4 text-sm text-rust">The product was created, but one or more images did not upload. Add any missing images below.</p>}{kind === "staff" && <AdminInviteForm />}<AdminManageForm kind={kind as Kind} users={users} settings={settings} product={product} taxonomy={taxonomy} />{kind === "product" && product && <AdminPhotoForm productId={product.id} />}</main>;
}
