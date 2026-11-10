import Link from "next/link";
import { notFound } from "next/navigation";
import screens from "@/design/interaction-expansion/screen-inventory.json";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { getAdminSectionData } from "@/lib/admin/sections";
import { AdminRowAction } from "@/components/AdminRowAction";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const sections = new Set(["products", "categories", "brands", "inventory", "movements", "sale", "orders", "customers", "discounts", "reviews", "delivery", "staff", "audit", "settings"]);

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { section } = await params;
  const { q = "" } = await searchParams;
  if (!sections.has(section)) notFound();
  const screen = screens.admin.find((item) => item.id === section);
  if (!screen) notFound();
  const preview = !getSupabasePublicEnv();
  const live = preview || section === "settings" ? null : await getAdminSectionData(section);
  const settings = !preview && section === "settings" ? (await (await createServerSupabaseClient()).from("store_settings").select("store_name,location,support_email,stock_alert_threshold").eq("singleton", true).single()).data : null;
  const columns = live?.columns ?? ("columns" in screen ? (screen.columns ?? []) : []);
  const rows = live?.rows ?? ("rows" in screen ? (screen.rows ?? []) : []);
  const fields = "fields" in screen ? (screen.fields ?? []) : [];
  const filteredRows = rows.map((row, index) => ({ row, id: live?.ids[index] })).filter(({ row }) => row.some((cell) => cell.toLowerCase().includes(q.toLowerCase())));
  const hasActions = !preview && ["products", "categories", "brands", "orders", "reviews", "discounts", "delivery"].includes(section);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <p className="mb-3 text-[11px] font-semibold tracking-widest text-ink-45 uppercase">Workspace / {screen.title}</p>
      <h1 className="text-2xl font-semibold">{screen.title}</h1>
      <p className="mt-2 text-sm text-ink-70">{"desc" in screen ? screen.desc : "Review workspace records."}</p>
      {!preview && ["products", "categories", "brands"].includes(section) && <Link href={`/admin/new/${section === "products" ? "product" : section === "categories" ? "category" : "brand"}`} className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Add {section === "products" ? "product" : section === "categories" ? "category" : "brand"}</Link>}
      {!preview && section === "inventory" && <Link href="/admin/stock" className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Receive stock</Link>}
      {!preview && section === "sale" && <Link href="/admin/sale/new" className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Record a sale</Link>}
      {!preview && section === "discounts" && <Link href="/admin/manage/discount" className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Add discount</Link>}
      {!preview && section === "delivery" && <Link href="/admin/manage/delivery" className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Add delivery zone</Link>}
      {!preview && section === "staff" && <Link href="/admin/manage/staff" className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Assign staff role</Link>}
      {!preview && section === "settings" && <Link href="/admin/manage/settings" className="mt-5 inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Edit settings</Link>}
      {preview && <p className="mt-6 rounded-lg border-l-[3px] border-blue bg-blue-tint px-4 py-3 text-xs text-ink-70">Design preview · Sample records only.</p>}
      {live?.error && <p role="alert" className="mt-6 rounded-lg border-l-[3px] border-rust bg-rust-tint px-4 py-3 text-xs">{live.error}</p>}
      {columns.length > 0 && <form action={`/admin/${section}`} className="mt-6 flex gap-2">
        <input name="q" defaultValue={q} aria-label={`Search ${screen.title.toLowerCase()}`} placeholder={`Search ${screen.title.toLowerCase()}`} className="w-full max-w-md rounded-lg border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-blue" />
        <button className="bg-ink px-5 text-sm font-semibold text-white">Search</button>
        {q && <Link href={`/admin/${section}`} className="self-center px-3 text-sm text-blue">Clear</Link>}
      </form>}
      {columns.length > 0 && <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[580px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs text-ink-45"><tr>{columns.map((column) => <th key={column} className="px-4 py-4 font-semibold">{column}</th>)}{hasActions && <th className="px-4 py-4 font-semibold">Action</th>}</tr></thead>
          <tbody>{filteredRows.map(({ row, id }, index) => <tr key={`${row[0]}-${index}`} className="border-b border-line last:border-b-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4">{cell}</td>)}{hasActions && <td className="px-4 py-4">{section === "products" && id ? <Link href={`/admin/manage/product?productId=${id}`} className="font-semibold text-blue">Edit</Link> : (section === "categories" || section === "brands") && id ? <Link href={`/admin/manage/${section === "categories" ? "category" : "brand"}?productId=${id}`} className="font-semibold text-blue">Edit</Link> : section === "orders" && id && row[1] === "paid" ? <AdminRowAction kind="order" id={id} /> : section === "reviews" && id && row[2] === "No" ? <AdminRowAction kind="review" id={id} /> : section === "discounts" && id ? <AdminRowAction kind="discount" id={id} active={row[3] === "Yes"} /> : section === "delivery" && id ? <AdminRowAction kind="delivery" id={id} active={row[3] === "Yes"} /> : null}</td>}</tr>)}</tbody>
        </table>
        {filteredRows.length === 0 && <p className="p-6 text-sm text-ink-45">No matching records.</p>}
      </div>}
      {preview && fields.length > 0 && <div className="mt-6 grid gap-3 md:grid-cols-2">{fields.map((field) => <div key={field.label} className="rounded-xl border border-line bg-panel p-4"><div className="mb-1 text-xs text-ink-45">{field.label}</div><div className="text-sm font-medium">{field.label === "Payment integration" ? "Configuration hidden in preview" : field.value}</div></div>)}</div>}
      {settings && <div className="mt-6 grid gap-3 md:grid-cols-2">{[["Store name", settings.store_name], ["Location", settings.location], ["Support email", settings.support_email || "—"], ["Low-stock threshold", String(settings.stock_alert_threshold)]].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-panel p-4"><div className="mb-1 text-xs text-ink-45">{label}</div><div className="text-sm font-medium">{value}</div></div>)}</div>}
    </main>
  );
}
