import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Cell = string;
type SectionData = { columns: string[]; rows: Cell[][]; ids: string[]; error?: string };

const definitions = {
  products: { table: "products", columns: ["Product", "Slug", "Condition", "Published"], fields: ["name", "slug", "condition", "is_published"] },
  categories: { table: "categories", columns: ["Category", "Slug", "Created"], fields: ["name", "slug", "created_at"] },
  brands: { table: "brands", columns: ["Brand", "Slug", "Created"], fields: ["name", "slug", "created_at"] },
  inventory: { table: "inventory_items", columns: ["IMEI", "Serial number", "Status", "Variant"], fields: ["imei", "serial_number", "status", "variant_id"] },
  movements: { table: "inventory_movements", columns: ["Reason", "Change", "Variant", "Created"], fields: ["reason", "change", "variant_id", "created_at"] },
  sale: { table: "inventory_items", columns: ["IMEI", "Serial number", "Status", "Variant"], fields: ["imei", "serial_number", "status", "variant_id"] },
  orders: { table: "orders", columns: ["Order", "Status", "Total", "Created"], fields: ["order_number", "status", "total_amount", "created_at"] },
  customers: { table: "profiles", columns: ["Name", "Phone", "Joined"], fields: ["full_name", "phone", "created_at"] },
  discounts: { table: "discounts", columns: ["Code", "Type", "Value", "Active"], fields: ["code", "type", "value", "is_active"] },
  reviews: { table: "reviews", columns: ["Rating", "Review", "Approved", "Created"], fields: ["rating", "body", "is_approved", "created_at"] },
  delivery: { table: "delivery_zones", columns: ["Zone", "State", "Fee", "Active"], fields: ["name", "state", "fee", "is_active"] },
  staff: { table: "user_roles", columns: ["User", "Role", "Assigned"], fields: ["user_id", "role", "created_at"] },
  audit: { table: "audit_logs", columns: ["Action", "Entity", "Actor", "Created"], fields: ["action", "entity_type", "actor_id", "created_at"] },
} as const;

function display(value: unknown, field: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && (["total_amount", "fee"].includes(field))) return `₦${(value / 100).toLocaleString("en-NG")}`;
  if (field === "created_at" && typeof value === "string") return new Date(value).toLocaleDateString("en-NG");
  return String(value);
}

export async function getAdminSectionData(section: string): Promise<SectionData> {
  const definition = definitions[section as keyof typeof definitions];
  if (!definition) return { columns: [], rows: [], ids: [] };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from(definition.table).select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return { columns: [...definition.columns], rows: [], ids: [], error: "Could not load records. Try again." };
  const rows = ((data ?? []) as Record<string, unknown>[]).filter((row) => section !== "sale" || row.status === "available");
  return { columns: [...definition.columns], rows: rows.map((row) => definition.fields.map((field) => section === "discounts" && field === "value" && row.type === "fixed" ? `₦${(Number(row.value) / 100).toLocaleString("en-NG")}` : section === "discounts" && field === "value" ? `${row.value}%` : display(row[field], field))), ids: rows.map((row) => String(row.id)) };
}
