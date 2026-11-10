import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get("code");if(code){const db=await createServerSupabaseClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL("/account",url.origin));}return NextResponse.redirect(new URL("/account/sign-in?confirmation=expired",url.origin));}
