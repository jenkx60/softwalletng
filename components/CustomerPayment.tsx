"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { openOrderPayment, verifyOrderPayment, cancelPendingCheckout } from "@/app/customer-actions";

export function CustomerPayment({orderId,status,review,purchasedItems=[],autoVerify=false}:{orderId:string;status:string;review:boolean;autoVerify?:boolean;purchasedItems?:{variant_id:string;quantity:number}[]}){
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [current,setCurrent]=useState(status);const [needsReview,setNeedsReview]=useState(review);const router=useRouter();
 useEffect(()=>{
  if(!autoVerify||status!=="pending"||review)return;
  let active=true;
  const timer=window.setTimeout(()=>{void verifyOrderPayment(orderId).then(result=>{
   if(!active)return;
   if(result.success){setCurrent(result.data.status);setNeedsReview(result.data.review);setMessage(result.data.review?"Payment received. Please contact support to complete your order.":["paid","fulfilled"].includes(result.data.status)?"Payment verified. Your order is confirmed.":"Payment is still pending. You can check again below.");router.refresh();}
   else setMessage(result.error);
  });},0);
  return()=>{active=false;window.clearTimeout(timer);};
 },[autoVerify,orderId,status,review,router]);
 async function check(){setBusy(true);const result=await verifyOrderPayment(orderId);if(result.success){setCurrent(result.data.status);setNeedsReview(result.data.review);setMessage(result.data.status==="paid"?"Payment verified. Your order is confirmed.":"Payment has not been confirmed yet. Check again shortly.");router.refresh();}else setMessage(result.error);setBusy(false);}
 async function retry(){setBusy(true);const result=await openOrderPayment(orderId);if(result.success)window.location.assign(result.data.url);else{setMessage(result.error);setBusy(false);}}
 const effectiveStatus=status!=="pending"?status:current;
 const paid=["paid","fulfilled"].includes(effectiveStatus);
 const terminal=["cancelled","refunded"].includes(effectiveStatus);
 const reviewRequired=needsReview||review;
 useEffect(()=>{if(!paid||!purchasedItems.length)return;try{const marker=`softwallet-purchased-${orderId}`;if(localStorage.getItem(marker))return;const raw:unknown=JSON.parse(localStorage.getItem("softwallet-basket")??"[]");if(Array.isArray(raw)){const next=raw.flatMap(line=>{if(!line||typeof line.variantId!=="string"||typeof line.quantity!=="number")return [];const purchased=purchasedItems.filter(item=>item.variant_id===line.variantId).reduce((sum,item)=>sum+item.quantity,0);return line.quantity>purchased?[{...line,quantity:line.quantity-purchased}]:[];});localStorage.setItem("softwallet-basket",JSON.stringify(next));localStorage.setItem(marker,"1");window.dispatchEvent(new Event("softwallet-basket"));}}catch{/* Storage restrictions must not hide a confirmed order. */}},[paid,orderId,purchasedItems]);
 async function cancel(){if(!window.confirm("Cancel this unpaid order and release its stock hold?"))return;setBusy(true);const result=await cancelPendingCheckout(orderId);if(result.success){setCurrent("cancelled");setMessage("Order cancelled. You can start again from your basket.");router.refresh();}else setMessage(result.error);setBusy(false);}

 return <section className="rounded-xl border border-line bg-panel p-6"><h2 className="text-xl font-semibold">{reviewRequired?"Your payment needs review":paid?"Payment confirmed":terminal?`Order ${effectiveStatus}`:"Confirm your payment"}</h2><p className="mt-3 text-sm text-ink-70">{reviewRequired?"Your payment arrived after the stock hold ended. Please contact support with your order number; we will arrange fulfillment or a refund.":paid?"Your order is saved. You can follow its progress from your account.":terminal?"This order is closed. Contact support below if you need assistance.":"We will confirm your payment securely. You can check its status below or continue an unpaid checkout."}</p>{message&&<p role="status" className="mt-4 text-sm">{message}</p>}{!paid&&!reviewRequired&&!terminal&&<div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={check} className="bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Please wait…":"Check payment status"}</button><button disabled={busy} onClick={retry} className="border border-line px-4 py-3 text-sm font-semibold disabled:opacity-50">Continue payment</button><button disabled={busy} onClick={cancel} className="px-3 py-2 text-sm text-rust">Cancel unpaid order</button></div>}<Link href={`/account/orders/${orderId}`} className="mt-5 block text-sm text-blue">View order and get help →</Link></section>;
}
