"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/auth";

const slug = z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const name = z.string().trim().min(2).max(160);
const id = z.uuid();
const maxPhotoBytes = 1_500_000;

async function validCompressedPhoto(file: File): Promise<boolean> {
  if (file.type !== "image/webp" || file.size === 0 || file.size > maxPhotoBytes) return false;
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(signature);
  return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
}

async function saveProductPhoto(
  client: ReturnType<typeof createServiceRoleClient>,
  productId: string,
  file: File,
  altText: string,
  sortOrder: number,
): Promise<boolean> {
  const path = `${productId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await client.storage.from("product-photos").upload(path, file, { contentType: "image/webp", upsert: false });
  if (uploadError) return false;
  // The database stores only the compact path; LiveProductPhoto builds the public URL.
  const { error: recordError } = await client.from("product_images").insert({
    product_id: productId, storage_path: path, alt_text: altText, sort_order: sortOrder,
  });
  if (recordError) {
    await client.storage.from("product-photos").remove([path]);
    return false;
  }
  return true;
}

const catalogueInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), name, slug }),
  z.object({ kind: z.literal("brand"), name, slug }),
  z.object({
    kind: z.literal("product"), name, slug,
    description: z.string().max(5000),
    condition: z.enum(["new", "uk_used"]),
    brandId: id,
    categoryId: id,
    sku: z.string().trim().min(2).max(80),
    priceNaira: z.coerce.number().int().min(0).max(21_474_836),
    isSerialized: z.boolean(),
    isPublished: z.boolean(),
  }),
]);

export async function createCatalogueRecord(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = catalogueInput.safeParse({
    kind: form.get("kind"), name: form.get("name"), slug: form.get("slug"),
    description: form.get("description") ?? "", condition: form.get("condition"),
    brandId: form.get("brandId"), categoryId: form.get("categoryId"),
    sku: form.get("sku"), priceNaira: form.get("priceNaira"),
    isSerialized: form.get("isSerialized") === "on",
    isPublished: form.get("isPublished") === "on",
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the form fields." };
  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (parsed.data.kind === "product" && (photos.length > 3 || form.getAll("photos").some((value) => !(value instanceof File)))) {
    return { success: false, error: "Choose up to three product images." };
  }
  if (parsed.data.kind === "product" && !(await Promise.all(photos.map(validCompressedPhoto))).every(Boolean)) {
    return { success: false, error: "Images must be compressed WebP files under 1.5 MB each. Select them again." };
  }

  const authorization = await requireRole(["inventory_manager", "super_admin"]);
  if (!authorization.success) return authorization;
  let admin;
  try { admin = createServiceRoleClient(); }
  catch { return { success: false, error: "Server inventory access is not configured." }; }

  const input = parsed.data;
  if (input.kind === "product") {
    const { data: productId, error } = await admin.rpc("admin_create_published_product", {
      p_name: input.name,
      p_slug: input.slug,
      p_description: input.description,
      p_condition: input.condition,
      p_brand_id: input.brandId,
      p_category_id: input.categoryId,
      p_sku: input.sku,
      p_price: input.priceNaira * 100,
      p_is_serialized: input.isSerialized,
      p_is_published: input.isPublished,
      p_actor_id: authorization.data.userId,
    });
    if (error || !productId) return { success: false, error: "Could not create product. Check that its slug and SKU are unique." };
    for (const [index, photo] of photos.entries()) {
      if (!await saveProductPhoto(admin, productId, photo, input.name, index)) {
        revalidatePath("/admin/products");
        revalidatePath("/shop");
        return { success: true, data: { href: `/admin/manage/product?productId=${productId}&photoUpload=failed` } };
      }
    }
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath(`/shop/${input.slug}`);
    revalidatePath("/admin/products");
    return { success: true, data: { href: "/admin/products" } };
  }

  const table = input.kind === "category" ? "categories" : "brands";
  const { data, error } = await admin.from(table).insert({ name: input.name, slug: input.slug }).select("id").single();
  if (error || !data) return { success: false, error: `Could not create ${input.kind}. Check that its slug is unique.` };
  await admin.from("audit_logs").insert({ actor_id: authorization.data.userId, action: "create", entity_type: input.kind, entity_id: data.id });
  revalidatePath("/shop");
  revalidatePath(`/admin/${table}`);
  return { success: true, data: { href: `/admin/${table}` } };
}

export async function uploadProductPhoto(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const productId = String(form.get("productId") ?? "");
  const file = form.get("photo");
  const altText = String(form.get("altText") ?? "").trim().slice(0, 160);
  if (!id.safeParse(productId).success || !(file instanceof File) || !(await validCompressedPhoto(file))) {
    return { success: false, error: "Choose a compressed WebP image under 1.5 MB." };
  }
  const admin = await authorizedAdmin(["inventory_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { data: product } = await admin.client.from("products").select("id,slug").eq("id", productId).is("deleted_at", null).single();
  if (!product) return { success: false, error: "Product no longer exists." };
  const { count } = await admin.client.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  if (!await saveProductPhoto(admin.client, productId, file, altText || product.slug, count ?? 0)) {
    return { success: false, error: "Photo upload failed. Please try again." };
  }
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "upload_photo", entity_type: "product", entity_id: productId });
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${product.slug}`);
  return { success: true, data: { href: `/admin/manage/product?productId=${productId}` } };
}

const intakeInput = z.object({
  variantId: id,
  imei: z.string().trim().max(32),
  serialNumber: z.string().trim().max(100),
  conditionGrade: z.string().trim().max(80),
  batteryHealth: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]),
}).refine((value) => Boolean(value.imei || value.serialNumber), "IMEI or serial number is required.");

export async function receiveSerializedUnit(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = intakeInput.safeParse({
    variantId: form.get("variantId"), imei: form.get("imei") ?? "",
    serialNumber: form.get("serialNumber") ?? "",
    conditionGrade: form.get("conditionGrade") ?? "",
    batteryHealth: form.get("batteryHealth") ?? "",
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the stock details." };
  const authorization = await requireRole(["inventory_manager", "super_admin"]);
  if (!authorization.success) return authorization;
  let admin;
  try { admin = createServiceRoleClient(); }
  catch { return { success: false, error: "Server inventory access is not configured." }; }
  const { error } = await admin.rpc("admin_receive_serialized_unit", {
    p_variant_id: parsed.data.variantId,
    p_imei: parsed.data.imei,
    p_serial_number: parsed.data.serialNumber,
    p_condition_grade: parsed.data.conditionGrade,
    p_battery_health: parsed.data.batteryHealth === "" ? null : parsed.data.batteryHealth,
    p_actor_id: authorization.data.userId,
  });
  if (error) return { success: false, error: "Could not receive unit. Check its IMEI or serial number is unique." };
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/movements");
  return { success: true, data: { href: "/admin/inventory" } };
}

export async function recordPhysicalSale(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const inventoryItemId = String(form.get("inventoryItemId") ?? "");
  const variantId = String(form.get("variantId") ?? "");
  const idempotencyKey = String(form.get("idempotencyKey") ?? "");
  if (!id.safeParse(idempotencyKey).success) return { success: false, error: "Sale request expired. Reload the form." };
  if (Boolean(inventoryItemId) === Boolean(variantId)) return { success: false, error: "Choose one unit or one quantity variant." };
  if (inventoryItemId && !id.safeParse(inventoryItemId).success) return { success: false, error: "Invalid unit." };
  if (variantId && !id.safeParse(variantId).success) return { success: false, error: "Invalid variant." };
  const quantity = Number(form.get("quantity") ?? 1);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return { success: false, error: "Invalid quantity." };
  const authorization = await requireRole(["sales_staff", "super_admin"]);
  if (!authorization.success) return authorization;
  let admin;
  try { admin = createServiceRoleClient(); }
  catch { return { success: false, error: "Server inventory access is not configured." }; }
  const { error } = await admin.rpc("admin_record_physical_sale_once", {
    p_idempotency_key: idempotencyKey,
    p_inventory_item_id: inventoryItemId || null,
    p_variant_id: variantId || null,
    p_quantity: quantity,
    p_actor_id: authorization.data.userId,
    p_notes: String(form.get("notes") ?? "").slice(0, 1000),
  });
  if (error) return { success: false, error: "Sale could not be recorded. Refresh stock and check availability." };
  revalidatePath("/admin/sale");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/movements");
  revalidatePath("/admin/orders");
  revalidatePath("/shop");
  return { success: true, data: { href: "/admin/orders" } };
}

export async function receiveQuantityStock(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const variantId = String(form.get("variantId") ?? "");
  const quantity = Number(form.get("quantity") ?? 0);
  if (!id.safeParse(variantId).success || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
    return { success: false, error: "Choose a variant and a quantity between 1 and 1000." };
  }
  const authorization = await requireRole(["inventory_manager", "super_admin"]);
  if (!authorization.success) return authorization;
  let admin;
  try { admin = createServiceRoleClient(); }
  catch { return { success: false, error: "Server inventory access is not configured." }; }
  const { error } = await admin.rpc("adjust_variant_quantity", {
    p_variant_id: variantId, p_delta: quantity, p_reason: "stock_intake",
    p_actor_id: authorization.data.userId, p_reference_type: "stock_intake", p_reference_id: crypto.randomUUID(),
  });
  if (error) return { success: false, error: "Could not receive stock. Confirm this is a quantity-based variant." };
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/movements");
  return { success: true, data: { href: "/admin/inventory" } };
}

async function authorizedAdmin(roles: Parameters<typeof requireRole>[0]): Promise<{ success: true; client: ReturnType<typeof createServiceRoleClient>; actorId: string } | { success: false; error: string }> {
  const authorization = await requireRole(roles);
  if (!authorization.success) return { success: false, error: authorization.error };
  try { return { success: true, client: createServiceRoleClient(), actorId: authorization.data.userId }; }
  catch { return { success: false, error: "Server admin access is not configured." }; }
}

export async function createDiscount(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/), type: z.enum(["percent", "fixed"]), value: z.coerce.number().int().min(1), minAmount: z.coerce.number().int().min(0) }).safeParse({ code: form.get("code"), type: form.get("type"), value: form.get("value"), minAmount: form.get("minAmount") || "0" });
  if (!parsed.success) return { success: false, error: "Check the discount fields." };
  const input = parsed.data;
  if (input.type === "percent" && input.value > 100) return { success: false, error: "Percent discounts cannot exceed 100%." };
  if (input.type === "fixed" && input.value > 21_474_836) return { success: false, error: "Amount is too large." };
  const admin = await authorizedAdmin(["order_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { data, error } = await admin.client.from("discounts").insert({ code: input.code.toUpperCase(), type: input.type, value: input.type === "fixed" ? input.value * 100 : input.value, min_amount: input.minAmount * 100 }).select("id").single();
  if (error || !data) return { success: false, error: "Could not create discount. Check that its code is unique." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "create", entity_type: "discount", entity_id: data.id });
  revalidatePath("/admin/discounts");
  return { success: true, data: { href: "/admin/discounts" } };
}

export async function createDeliveryZone(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ name, state: z.string().trim().min(2).max(100), feeNaira: z.coerce.number().int().min(0).max(21_474_836) }).safeParse({ name: form.get("name"), state: form.get("state"), feeNaira: form.get("feeNaira") });
  if (!parsed.success) return { success: false, error: "Check the delivery zone fields." };
  const admin = await authorizedAdmin(["order_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { data, error } = await admin.client.from("delivery_zones").insert({ name: parsed.data.name, state: parsed.data.state, fee: parsed.data.feeNaira * 100 }).select("id").single();
  if (error || !data) return { success: false, error: "Could not create delivery zone." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "create", entity_type: "delivery_zone", entity_id: data.id });
  revalidatePath("/admin/delivery");
  return { success: true, data: { href: "/admin/delivery" } };
}

export async function toggleAdminRecord(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ recordId: id, kind: z.enum(["discount", "delivery"]), active: z.enum(["true", "false"]) }).safeParse({ recordId: form.get("recordId"), kind: form.get("kind"), active: form.get("active") });
  if (!parsed.success) return { success: false, error: "Invalid record." };
  const admin = await authorizedAdmin(["order_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const table = parsed.data.kind === "discount" ? "discounts" : "delivery_zones";
  const nextActive = parsed.data.active !== "true";
  const { data, error } = await admin.client.from(table).update({ is_active: nextActive }).eq("id", parsed.data.recordId).eq("is_active", !nextActive).select("id").single();
  if (error || !data) return { success: false, error: "Record changed. Refresh and try again." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: nextActive ? "activate" : "deactivate", entity_type: parsed.data.kind, entity_id: parsed.data.recordId });
  revalidatePath(`/admin/${parsed.data.kind === "discount" ? "discounts" : "delivery"}`);
  revalidatePath("/checkout");
  return { success: true, data: { href: `/admin/${parsed.data.kind === "discount" ? "discounts" : "delivery"}` } };
}

export async function approveReview(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const reviewId = String(form.get("reviewId") ?? "");
  if (!id.safeParse(reviewId).success) return { success: false, error: "Invalid review." };
  const admin = await authorizedAdmin(["order_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { error } = await admin.client.from("reviews").update({ is_approved: true }).eq("id", reviewId).eq("is_approved", false);
  if (error) return { success: false, error: "Could not approve review." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "approve", entity_type: "review", entity_id: reviewId });
  revalidatePath("/admin/reviews");
  return { success: true, data: { href: "/admin/reviews" } };
}

export async function fulfillOrder(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const orderId = String(form.get("orderId") ?? "");
  if (!id.safeParse(orderId).success) return { success: false, error: "Invalid order." };
  const admin = await authorizedAdmin(["order_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { data, error } = await admin.client.from("orders").update({ status: "fulfilled" }).eq("id", orderId).eq("status", "paid").select("id").single();
  if (error || !data) return { success: false, error: "Only paid orders can be fulfilled." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "fulfill", entity_type: "order", entity_id: orderId });
  revalidatePath("/admin/orders");
  return { success: true, data: { href: "/admin/orders" } };
}

export async function assignStaffRole(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ userId: id, role: z.enum(["sales_staff", "inventory_manager", "order_manager", "super_admin"]) }).safeParse({ userId: form.get("userId"), role: form.get("role") });
  if (!parsed.success) return { success: false, error: "Choose a user and staff role." };
  const admin = await authorizedAdmin(["super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { error } = await admin.client.from("user_roles").insert({ user_id: parsed.data.userId, role: parsed.data.role });
  if (error) return { success: false, error: "Could not assign role. It may already be assigned." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "assign_role", entity_type: "user", entity_id: parsed.data.userId, metadata: { role: parsed.data.role } });
  revalidatePath("/admin/staff");
  return { success: true, data: { href: "/admin/staff" } };
}

export async function inviteStaff(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ email: z.email(), role: z.enum(["sales_staff", "inventory_manager", "order_manager", "super_admin"]) }).safeParse({ email: form.get("email"), role: form.get("role") });
  if (!parsed.success) return { success: false, error: "Enter a valid email and role." };
  const admin = await authorizedAdmin(["super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return { success: false, error: "Site URL is not configured for invitations." };
  const redirectTo = new URL("/auth/set-password", siteUrl).toString();
  const { data, error } = await admin.client.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo });
  if (error || !data.user) return { success: false, error: "Could not send invitation. This email may already have an account." };
  const { error: roleError } = await admin.client.from("user_roles").insert({ user_id: data.user.id, role: parsed.data.role });
  if (roleError) return { success: false, error: "Invitation sent, but the role could not be assigned. Assign it from the staff list before the user signs in." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "invite_staff", entity_type: "user", entity_id: data.user.id, metadata: { role: parsed.data.role } });
  revalidatePath("/admin/staff");
  return { success: true, data: { href: "/admin/staff" } };
}

export async function saveSettings(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ storeName: name, location: z.string().trim().min(2).max(200), supportEmail: z.email(), threshold: z.coerce.number().int().min(0).max(10000) }).safeParse({ storeName: form.get("storeName"), location: form.get("location"), supportEmail: form.get("supportEmail"), threshold: form.get("threshold") });
  if (!parsed.success) return { success: false, error: "Check the store settings." };
  const admin = await authorizedAdmin(["super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { data, error } = await admin.client.from("store_settings").update({ store_name: parsed.data.storeName, location: parsed.data.location, support_email: parsed.data.supportEmail, stock_alert_threshold: parsed.data.threshold }).eq("singleton", true).select("id").single();
  if (error || !data) return { success: false, error: "Could not save settings." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "update", entity_type: "store_settings", entity_id: data.id });
  revalidatePath("/admin/settings");
  return { success: true, data: { href: "/admin/settings" } };
}

export async function updateProduct(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ productId: id, variantId: id, name, description: z.string().max(5000), priceNaira: z.coerce.number().int().min(0).max(21_474_836), isPublished: z.boolean() }).safeParse({ productId: form.get("productId"), variantId: form.get("variantId"), name: form.get("name"), description: form.get("description") ?? "", priceNaira: form.get("priceNaira"), isPublished: form.get("isPublished") === "on" });
  if (!parsed.success) return { success: false, error: "Check the product details." };
  const admin = await authorizedAdmin(["inventory_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const { error } = await admin.client.rpc("admin_update_published_product", { p_product_id: parsed.data.productId, p_variant_id: parsed.data.variantId, p_name: parsed.data.name, p_description: parsed.data.description, p_price: parsed.data.priceNaira * 100, p_is_published: parsed.data.isPublished, p_actor_id: admin.actorId });
  if (error) return { success: false, error: "Could not update product." };
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { success: true, data: { href: "/admin/products" } };
}

export async function updateTaxonomy(_previous: ActionResult<{ href: string }> | null, form: FormData): Promise<ActionResult<{ href: string }>> {
  const parsed = z.object({ kind: z.enum(["category", "brand"]), recordId: id, name }).safeParse({ kind: form.get("kind"), recordId: form.get("recordId"), name: form.get("name") });
  if (!parsed.success) return { success: false, error: "Check the name." };
  const admin = await authorizedAdmin(["inventory_manager", "super_admin"]);
  if (!admin.success) return { success: false, error: admin.error };
  const table = parsed.data.kind === "category" ? "categories" : "brands";
  const { data, error } = await admin.client.from(table).update({ name: parsed.data.name }).eq("id", parsed.data.recordId).select("id").single();
  if (error || !data) return { success: false, error: "Could not update this record." };
  await admin.client.from("audit_logs").insert({ actor_id: admin.actorId, action: "update", entity_type: parsed.data.kind, entity_id: parsed.data.recordId });
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath(`/admin/${table}`);
  return { success: true, data: { href: `/admin/${table}` } };
}
