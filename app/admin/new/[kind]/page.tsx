import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCatalogueForm } from "@/components/AdminCatalogueForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export default async function NewAdminRecordPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "product" && kind !== "category" && kind !== "brand") notFound();
  const supabase = getSupabasePublicEnv() ? await createServerSupabaseClient() : null;
  const [brandResult, categoryResult] = supabase ? await Promise.all([
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("categories").select("id,name").is("deleted_at", null).order("name"),
  ]) : [{ data: [] }, { data: [] }];
  return <main className="px-4 py-6 md:px-8 md:py-8">
    <Link href={`/admin/${kind === "product" ? "products" : `${kind}s`}`} className="text-sm text-blue">← Back</Link>
    <h1 className="mt-5 text-2xl font-semibold">Add {kind}</h1>
    {kind === "product" && (!brandResult.data?.length || !categoryResult.data?.length) && <p className="mt-4 text-sm text-rust">Add a brand and category before creating a product.</p>}
    <AdminCatalogueForm kind={kind} brands={brandResult.data ?? []} categories={categoryResult.data ?? []} />
  </main>;
}
