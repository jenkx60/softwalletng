"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/auth";
export async function respondToRequest(_previous:ActionResult<{id:string}>|null,form:FormData):Promise<ActionResult<{id:string}>>{
 const auth=await requireRole(["order_manager","super_admin"]);if(!auth.success)return auth;
 const parsed=z.object({id:z.uuid(),response:z.string().trim().min(2).max(5000),status:z.enum(["open","in_progress","resolved"])}).safeParse(Object.fromEntries(form));if(!parsed.success)return {success:false,error:"Check the response and status."};
 const db=createServiceRoleClient();const {data,error}=await db.from("customer_requests").update({response:parsed.data.response,status:parsed.data.status}).eq("id",parsed.data.id).select("id").single();if(error||!data)return {success:false,error:"Could not save response."};
 await db.from("audit_logs").insert({actor_id:auth.data.userId,action:"respond",entity_type:"customer_request",entity_id:data.id});revalidatePath("/admin/support");revalidatePath("/account/help");return {success:true,data};
}
