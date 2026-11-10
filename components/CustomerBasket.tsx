"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useSyncExternalStore, useRef } from "react";
import { useRouter } from "next/navigation";
import { quoteBasket, startCheckout, openOrderPayment, type BasketLine, type QuotedLine } from "@/app/customer-actions";
import { formatNaira } from "@/lib/format";

const basketKey="softwallet-basket";
function readBasket():BasketLine[]{
 try{const parsed:unknown=JSON.parse(localStorage.getItem(basketKey)??"[]");return Array.isArray(parsed)?parsed.filter((line):line is BasketLine=>typeof line==="object"&&line!==null&&typeof line.variantId==="string"&&Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=20).slice(0,30):[];}catch{return [];}
}
function subscribeBasket(callback:()=>void){window.addEventListener("storage",callback);window.addEventListener("softwallet-basket",callback);return()=>{window.removeEventListener("storage",callback);window.removeEventListener("softwallet-basket",callback);};}
function writeBasket(lines:BasketLine[]){localStorage.setItem(basketKey,JSON.stringify(lines));window.dispatchEvent(new Event("softwallet-basket"));}

export function AddToBasket({variantId,price}:{variantId:string;price:number}){
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function add(){
  setBusy(true);const lines=readBasket();const current=lines.find(line=>line.variantId===variantId);const quantity=(current?.quantity??0)+1;
  const result=await quoteBasket([{variantId,quantity}]);
  if(!result.success)setMessage(result.error);
  else if(result.data[0].available<quantity)setMessage("This quantity is no longer available.");
  else{writeBasket([...lines.filter(line=>line.variantId!==variantId),{variantId,quantity,expectedPrice:price}]);setMessage("Added to your basket.");}
  setBusy(false);
 }
 return <div className="mt-3"><button onClick={add} disabled={busy} className="bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Checking stock…":"Add to basket"}</button>{message&&<p role="status" className="mt-2 text-sm">{message} <Link href="/cart" className="text-blue">View basket</Link></p>}</div>;
}

export type DeliveryAddress={id:string;recipient_name:string;line1:string;city:string;state:string;phone:string};
export type DeliveryZone={id:string;name:string;state:string|null;fee:number};
export function CustomerBasket({checkout=false,addresses=[],zones=[]}:{checkout?:boolean;addresses?:DeliveryAddress[];zones?:DeliveryZone[]}){
 const router=useRouter();const snapshot=useSyncExternalStore(subscribeBasket,()=>localStorage.getItem(basketKey)??"[]",()=>null);const lines=useMemo(()=>snapshot===null?[]:readBasket(),[snapshot]);const [quoted,setQuoted]=useState<QuotedLine[]>([]);const loaded=snapshot!==null;const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [address,setAddress]=useState(addresses[0]?.id??"");const [zone,setZone]=useState("");const [code,setCode]=useState("");const [orderId,setOrderId]=useState("");const [finalQuote,setFinalQuote]=useState<{total:number;discount:number}|null>(null);const requestKey=useRef("");const [quotedSnapshot,setQuotedSnapshot]=useState<string|null>(null);const fetching=Boolean(lines.length)&&quotedSnapshot!==snapshot;

 useEffect(()=>{let active=true;if(!lines.length)return;void quoteBasket(lines).then(result=>{if(!active)return;if(result.success){setQuoted(result.data);setError("");}else{setQuoted([]);setError(result.error);}setQuotedSnapshot(snapshot);});return()=>{active=false};},[lines,snapshot]);
 function update(variantId:string,quantity:number){const next=lines.flatMap(line=>line.variantId===variantId?(quantity?[{...line,quantity}]:[]):[line]);writeBasket(next);setOrderId("");requestKey.current="";}
 const selectedAddress=addresses.find(item=>item.id===address);
 const validZones=zones.filter(item=>item.state?.toLowerCase()===selectedAddress?.state.toLowerCase());
 const delivery=validZones.find(item=>item.id===zone);
 const subtotal=quoted.reduce((sum,line)=>sum+line.price*line.quantity,0);
 const unavailable=quoted.some(line=>line.available<line.quantity);
 const changed=quoted.some(line=>line.expectedPrice!==undefined&&line.expectedPrice!==line.price);
 async function pay(){
  setBusy(true);setError("");let nextOrder=orderId;
  if(!nextOrder){const result=await startCheckout({lines:quoted.map(line=>({variantId:line.variantId,quantity:line.quantity,expectedPrice:line.price})),key:requestKey.current||(requestKey.current=crypto.randomUUID()),addressId:address,zoneId:zone,code});if(!result.success){setError(result.error);setBusy(false);return;}nextOrder=result.data.orderId;setOrderId(nextOrder);setFinalQuote({total:result.data.total,discount:result.data.discount});setBusy(false);return;}
  const payment=await openOrderPayment(nextOrder);if(payment.success)window.location.assign(payment.data.url);else{setError(payment.error);setBusy(false);}
 }
 if(!loaded)return <p className="py-8" role="status">Loading your basket…</p>;
 if(!lines.length)return <section className="rounded-xl border border-line bg-panel p-8"><h2 className="text-xl font-semibold">Your basket is empty</h2><Link href="/shop" className="mt-4 inline-block text-blue">Explore devices →</Link></section>;
 return <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
  <div className="space-y-4">{(quoted.length?quoted:lines.map(line=>({...line,name:"Unavailable product",slug:"",label:"",price:0,available:0}))).map(line=><section key={line.variantId} className="rounded-xl border border-line bg-panel p-5">{"name" in line&&<><Link href={`/shop/${line.slug}`} className="font-semibold">{line.name}</Link><p className="mt-1 text-sm text-ink-70">{line.label} · {formatNaira(line.price)}</p>{line.available<line.quantity&&<p className="mt-2 text-sm text-rust">Only {line.available} available. Reduce quantity or remove this item.</p>}</>}<div className="mt-4 flex items-center gap-3"><label className="text-sm">Quantity <input aria-label="Quantity" type="number" min="1" max="20" value={line.quantity} disabled={busy||fetching||Boolean(orderId)} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>=1&&value<=20)update(line.variantId,value);}} className="ml-2 w-20 border border-line p-2" /></label><button disabled={busy||fetching||Boolean(orderId)} onClick={()=>update(line.variantId,0)} className="text-sm text-rust">Remove</button></div></section>)}
  {checkout&&<section className="space-y-4 rounded-xl border border-line bg-panel p-5"><h2 className="text-lg font-semibold">Delivery</h2><label className="block text-sm">Address<select value={address} disabled={Boolean(orderId)} onChange={event=>{setAddress(event.target.value);setZone("");}} className="mt-2 w-full border border-line p-3"><option value="">Choose address</option>{addresses.map(item=><option key={item.id} value={item.id}>{item.recipient_name} · {item.line1}, {item.city}, {item.state}</option>)}</select></label><Link href="/account/addresses" className="block text-sm text-blue">Add an address</Link><label className="block text-sm">Delivery area<select value={zone} disabled={Boolean(orderId)} onChange={event=>setZone(event.target.value)} className="mt-2 w-full border border-line p-3"><option value="">Choose delivery area</option>{validZones.map(item=><option key={item.id} value={item.id}>{item.name} · {formatNaira(item.fee)}</option>)}</select></label>{selectedAddress&&!validZones.length&&<p className="text-sm text-rust">Delivery is not currently available for this state. Contact support to arrange collection.</p>}<label className="block text-sm">Discount code (optional)<input value={code} disabled={Boolean(orderId)} onChange={event=>setCode(event.target.value.toUpperCase())} maxLength={40} className="mt-2 w-full border border-line p-3" /></label></section>}
  </div><aside className="h-fit rounded-xl border border-line bg-panel p-6"><h2 className="text-xl font-semibold">Order summary</h2><div className="mt-5 flex justify-between"><span>Items</span><strong>{formatNaira(subtotal)}</strong></div>{checkout&&<div className="mt-3 flex justify-between"><span>Delivery</span><span>{delivery?formatNaira(delivery.fee):"Choose an area"}</span></div>}<div className="mt-5 flex justify-between border-t border-line pt-4 font-semibold"><span>{finalQuote?"Final total":code?"Before discount":"Total"}</span><span>{formatNaira(finalQuote?.total??subtotal+(delivery?.fee??0))}</span></div>{finalQuote&&<p className="mt-3 text-sm text-ink-70">Discount applied: {formatNaira(finalQuote.discount)}. Review your final total before paying.</p>}{changed&&<p role="alert" className="mt-4 text-sm text-rust">Prices have changed since you added these items. Review the updated prices above.</p>}{error&&<p role="alert" className="mt-4 text-sm text-rust">{error}</p>}{checkout?<><p className="mt-4 text-xs text-ink-70">Review your final total before opening secure payment. Stock is held for 20 minutes after your order is prepared.</p><button onClick={pay} disabled={busy||fetching||unavailable||!delivery||!quoted.length} className="mt-5 w-full bg-ink p-3 font-semibold text-white disabled:opacity-50">{busy?"Preparing…":orderId?"Pay securely with Paystack":"Review final total"}</button>{orderId&&<Link href={`/account/orders/${orderId}`} className="mt-3 block text-sm text-blue">View saved order</Link>}</>:<button disabled={busy||fetching||unavailable||!quoted.length} onClick={()=>router.push("/checkout")} className="mt-5 w-full bg-ink p-3 font-semibold text-white disabled:opacity-50">Proceed to checkout</button>}<Link href="/shop" className="mt-4 block text-center text-sm text-blue">Continue shopping</Link></aside>
 </div>;
}
