import { redirect } from "next/navigation";
import { CustomerBasket } from "@/components/CustomerBasket";
import { SiteHeader } from "@/components/SiteHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export default async function CheckoutPage(){
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/account/sign-in?next=/checkout");
 const [addresses,zones]=await Promise.all([db.from("addresses").select("id,recipient_name,line1,city,state,phone").eq("user_id",user.id).order("created_at",{ascending:false}),db.from("delivery_zones").select("id,name,state,fee").eq("is_active",true).order("name")]);
 return <><SiteHeader /><main className="page-container flex-1 py-10"><p className="mb-3 text-sm text-ink-70">1 Delivery → 2 Review → 3 Secure payment</p><h1 className="mb-7 text-3xl font-semibold">Checkout</h1><CustomerBasket checkout addresses={addresses.data??[]} zones={zones.data??[]} /></main></>;
}
