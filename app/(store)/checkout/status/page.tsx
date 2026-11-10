import { redirect, notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/customer";
import { CustomerShell } from "@/components/CustomerShell";
import { CustomerPayment } from "@/components/CustomerPayment";
export default async function Page({searchParams}:{searchParams:Promise<{order?:string}>}){const {order}=await searchParams;if(!order)redirect("/account/orders");const {user,db}=await requireCustomer(`/checkout/status?order=${order}`);const {data}=await db.from("orders").select("id,status,payment_review,order_items(variant_id,quantity)").eq("id",order).eq("user_id",user.id).single();if(!data)notFound();return <CustomerShell title="Payment status"><CustomerPayment autoVerify orderId={data.id} status={data.status} review={data.payment_review} purchasedItems={data.order_items} /></CustomerShell>;}
