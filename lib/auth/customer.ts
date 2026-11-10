import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function requireCustomer(path:string){const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect(`/account/sign-in?next=${encodeURIComponent(path)}`);return {user,db};}
