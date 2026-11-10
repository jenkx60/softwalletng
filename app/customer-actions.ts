"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { initializedPayment, paystackRequest, verifiedPayment } from "@/lib/paystack/client";
import type { ActionResult } from "@/types/auth";

const linesSchema = z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(20), expectedPrice: z.number().int().nonnegative().optional() })).min(1).max(30);
export type BasketLine = { variantId: string; quantity: number; expectedPrice?: number };
export type QuotedLine = BasketLine & { name: string; slug: string; label: string; price: number; available: number };

async function customer() {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Please sign in to continue.");
  return { user, db, admin: createServiceRoleClient() };
}
function failure(error: unknown): { success: false; error: string } {
  if(error instanceof z.ZodError)return {success:false,error:error.issues[0]?.message??"Check the form fields."};
  return { success: false, error: error instanceof Error ? error.message : "We could not complete this request. Please try again." };
}

export async function saveCustomerProfile(_previous:ActionResult<{id:string}>|null,form:FormData):Promise<ActionResult<{id:string}>>{
 try{const {user,admin}=await customer();const input=z.object({full_name:z.string().trim().min(2).max(120),phone:z.string().trim().min(7).max(30)}).parse(Object.fromEntries(form));const {error}=await admin.from("profiles").update(input).eq("id",user.id);if(error)throw new Error("Profile could not be saved.");revalidatePath("/account");return {success:true,data:{id:user.id}};}catch(error){return failure(error);}
}

export async function submitCustomerReview(_previous:ActionResult<{id:string}>|null,form:FormData):Promise<ActionResult<{id:string}>>{
 try{const {user,admin}=await customer();const input=z.object({orderId:z.uuid(),variantId:z.uuid(),rating:z.coerce.number().int().min(1).max(5),body:z.string().trim().min(3).max(3000)}).parse(Object.fromEntries(form));const {data:order}=await admin.from("orders").select("id").eq("id",input.orderId).eq("user_id",user.id).eq("status","fulfilled").single();if(!order)throw new Error("Reviews are available after your order is fulfilled.");const {data:item}=await admin.from("order_items").select("variant_id").eq("order_id",order.id).eq("variant_id",input.variantId).limit(1).maybeSingle();if(!item)throw new Error("This item is not part of your order.");const {data:variant}=await admin.from("product_variants").select("product_id").eq("id",item.variant_id).single();if(!variant)throw new Error("Product unavailable.");const {data,error}=await admin.from("reviews").insert({user_id:user.id,order_id:order.id,product_id:variant.product_id,rating:input.rating,body:input.body,is_verified:true,is_approved:false}).select("id").single();if(error||!data)throw new Error("Review could not be saved.");return {success:true,data};}catch(error){return failure(error);}
}

export async function cancelPendingCheckout(orderId:string):Promise<ActionResult<{id:string}>>{
 try{z.uuid().parse(orderId);const {user,admin}=await customer();const {error}=await admin.rpc("release_customer_checkout",{p_order:orderId,p_user:user.id});if(error)throw new Error("This order cannot be cancelled automatically. Contact support.");revalidatePath("/account/orders");revalidatePath(`/account/orders/${orderId}`);return {success:true,data:{id:orderId}};}catch(error){return failure(error);}
}

export async function quoteBasket(input: BasketLine[]): Promise<ActionResult<QuotedLine[]>> {
  try {
    const lines = linesSchema.parse(input);
    const admin = createServiceRoleClient();
    const output: QuotedLine[] = [];
    for (const line of lines) {
      const { data: v } = await admin.from("product_variants").select("id,product_id,storage,color,price,quantity,is_serialized").eq("id", line.variantId).single();
      if (!v) throw new Error("A product in your basket no longer exists. Remove it and try again.");
      const { data: p } = await admin.from("products").select("name,slug").eq("id",v.product_id).eq("is_published",true).is("deleted_at",null).single();
      if (!p) throw new Error("A product in your basket is no longer listed.");
      const { data: holds, error: holdError } = await admin.from("checkout_holds").select("quantity,inventory_item_id").eq("variant_id",v.id).is("released_at",null).gt("expires_at",new Date().toISOString());
      if (holdError) throw new Error("Stock availability could not be checked.");
      let available = v.quantity;
      if (v.is_serialized) {
        const { data: items, error } = await admin.from("inventory_items").select("id").eq("variant_id",v.id).eq("status","available");
        if (error) throw new Error("Stock availability could not be checked.");
        available = (items ?? []).filter(item => !holds?.some(h => h.inventory_item_id === item.id)).length;
      } else available -= (holds ?? []).reduce((sum,h)=>sum+h.quantity,0);
      output.push({ ...line, name:p.name,slug:p.slug,label:[v.storage,v.color].filter(Boolean).join(" · "),price:v.price,available:Math.max(0,available) });
    }
    return {success:true,data:output};
  } catch(error) { return failure(error); }
}

export async function saveCustomerAddress(_previous: ActionResult<{id:string}> | null, form: FormData): Promise<ActionResult<{id:string}>> {
 try {
  const {user,admin}=await customer();
  const input=z.object({recipient_name:z.string().trim().min(2).max(120),phone:z.string().trim().min(7).max(30),line1:z.string().trim().min(5).max(240),city:z.string().trim().min(2).max(100),state:z.string().trim().min(2).max(100)}).parse(Object.fromEntries(form));
  const id=z.union([z.uuid(),z.literal("")]).parse(form.get("id")??"");
  const query=id?admin.from("addresses").update(input).eq("id",id).eq("user_id",user.id):admin.from("addresses").insert({...input,user_id:user.id});
  const {data,error}=await query.select("id").single();
  if(error||!data) throw new Error("Address could not be saved.");
  revalidatePath("/checkout");revalidatePath("/account/addresses");return {success:true,data};
 } catch(error){return failure(error);}
}

export async function startCheckout(input: {lines:BasketLine[];key:string;addressId:string;zoneId:string;code:string}): Promise<ActionResult<{orderId:string;total:number;discount:number}>> {
 try {
  if(!process.env.PAYSTACK_SECRET_KEY) throw new Error("Online payments are not configured yet. Your basket is saved.");
  const {user,admin}=await customer();
  const parsed=z.object({lines:linesSchema,key:z.uuid(),addressId:z.uuid(),zoneId:z.uuid(),code:z.string().max(40)}).parse(input);
  const {data,error}=await admin.rpc("begin_customer_checkout",{p_user:user.id,p_key:parsed.key,p_lines:parsed.lines,p_address:parsed.addressId,p_zone:parsed.zoneId,p_code:parsed.code});
  if(error) throw new Error(error.message);
  const {data:order,error:orderError}=await admin.from("orders").select("total_amount,discount_amount").eq("id",String(data)).eq("user_id",user.id).single();
  if(orderError||!order)throw new Error("Your order was saved. Open Orders to continue payment.");
  return {success:true,data:{orderId:String(data),total:order.total_amount,discount:order.discount_amount}};
 }catch(error){return failure(error);}
}

export async function openOrderPayment(orderId:string): Promise<ActionResult<{url:string}>> {
 try {
  z.uuid().parse(orderId);const {user,admin}=await customer();
  const {data:order}=await admin.from("orders").select("id,status,total_amount,payment_review").eq("id",orderId).eq("user_id",user.id).single();
  if(!order||order.status!=="pending"||order.payment_review) throw new Error("This order is not awaiting payment.");
  if(order.total_amount<100)throw new Error("This order requires support to complete because its total is below the payment minimum.");
  const {data:holds}=await admin.from("checkout_holds").select("expires_at,released_at").eq("order_id",order.id);
  if(!holds?.length||holds.some(h=>h.released_at||new Date(h.expires_at).getTime()<=Date.now())) throw new Error("Your stock hold expired. Return to your basket and check out again.");
  const {data:payment}=await admin.from("payments").select("paystack_reference,checkout_url").eq("order_id",orderId).single();
  if(!payment) throw new Error("Payment record is unavailable.");
  if(payment.checkout_url) return {success:true,data:{url:payment.checkout_url}};
  const origin=process.env.NEXT_PUBLIC_SITE_URL;
  if(!origin) throw new Error("Payment return URL is not configured.");
  const result=initializedPayment.parse(await paystackRequest("/transaction/initialize",{email:user.email,amount:order.total_amount,currency:"NGN",reference:payment.paystack_reference,callback_url:new URL(`/checkout/status?order=${orderId}`,origin).toString()}));
  const url=new URL(result.data.authorization_url);
  if(url.protocol!=="https:"||url.hostname!=="checkout.paystack.com"||result.data.reference!==payment.paystack_reference) throw new Error("Invalid payment provider response.");
  const {error}=await admin.from("payments").update({checkout_url:url.toString()}).eq("paystack_reference",payment.paystack_reference);
  if(error) throw new Error("Could not save payment link. Please retry from your order.");
  return {success:true,data:{url:url.toString()}};
 }catch(error){return failure(error);}
}

export async function verifyOrderPayment(orderId:string): Promise<ActionResult<{status:string;review:boolean}>> {
 try {
  z.uuid().parse(orderId);const {user,admin}=await customer();
  const {data:order}=await admin.from("orders").select("id,status,payment_review").eq("id",orderId).eq("user_id",user.id).single();
  if(!order) throw new Error("Order not found.");
  if(order.status!=="pending"||order.payment_review) return {success:true,data:{status:order.status,review:order.payment_review}};
  const {data:payment}=await admin.from("payments").select("paystack_reference").eq("order_id",order.id).single();
  if(!payment) throw new Error("Payment is unavailable.");
  const result=verifiedPayment.parse(await paystackRequest(`/transaction/verify/${encodeURIComponent(payment.paystack_reference)}`));
  if(result.data.reference!==payment.paystack_reference) throw new Error("Payment reference mismatch.");
  if(result.data.status==="success") {
   const {error}=await admin.rpc("fulfill_payment",{p_reference:payment.paystack_reference,p_amount_kobo:result.data.amount});
   if(error) throw new Error("Payment needs review. Contact support with your order number.");
   const {data:updated}=await admin.from("orders").select("status,payment_review").eq("id",order.id).single();
   revalidatePath("/account/orders");return {success:true,data:{status:updated?.status??"pending",review:updated?.payment_review??true}};
  }
  return {success:true,data:{status:result.data.status,review:false}};
 }catch(error){return failure(error);}
}

export async function submitCustomerRequest(_previous:ActionResult<{id:string}>|null,form:FormData):Promise<ActionResult<{id:string}>> {
 try {
  const {user,admin}=await customer();
  const input=z.object({kind:z.enum(["support","cancellation","return","restock"]),subject:z.string().trim().min(2).max(160),message:z.string().trim().min(2).max(5000),orderId:z.union([z.uuid(),z.literal("")]).optional()}).parse(Object.fromEntries(form));
  if(input.orderId){const {data}=await admin.from("orders").select("id").eq("id",input.orderId).eq("user_id",user.id).single();if(!data)throw new Error("Order not found.");}
  const {data,error}=await admin.from("customer_requests").insert({user_id:user.id,order_id:input.orderId||null,kind:input.kind,subject:input.subject,message:input.message}).select("id").single();
  if(error||!data) throw new Error("Request could not be saved.");
  revalidatePath("/account/help");return {success:true,data};
 }catch(error){return failure(error);}
}

export async function deleteCustomerAddress(_previous:ActionResult<{id:string}>|null,form:FormData):Promise<ActionResult<{id:string}>> {
 try {
  const id=z.uuid().parse(form.get("id"));const {user,admin}=await customer();
  const {data,error}=await admin.from("addresses").delete().eq("id",id).eq("user_id",user.id).select("id").single();
  if(error||!data)throw new Error("Address could not be removed. Please refresh and try again.");
  revalidatePath("/account/addresses");revalidatePath("/checkout");return {success:true,data};
 }catch(error){return failure(error);}
}
