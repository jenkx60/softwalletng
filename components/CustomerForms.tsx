"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerAddress, deleteCustomerAddress, submitCustomerRequest, saveCustomerProfile, submitCustomerReview } from "@/app/customer-actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type SavedAddress = {id:string;recipient_name:string;phone:string;line1:string;city:string;state:string};
export function AddressForm({address}:{address?:SavedAddress}) {
 const [state,action,busy]=useActionState(saveCustomerAddress,null);const router=useRouter();
 useEffect(()=>{if(state?.success)router.refresh();},[state,router]);
 const fields=[['recipient_name','Recipient name'],['phone','Phone'],['line1','Street address'],['city','City'],['state','State']] as const;
 return <form action={action} className="mt-7 max-w-xl space-y-4 rounded-xl border border-line bg-panel p-6">
  <h2 className="text-xl font-semibold">{address?'Edit delivery address':'Add delivery address'}</h2>
  <input type="hidden" name="id" value={address?.id??''}/>
  {fields.map(([name,label])=><label key={name} className="block text-sm">{label}<input required name={name} defaultValue={address?.[name]??''} className="mt-2 w-full border border-line p-3" /></label>)}
  {address&&<p className="text-sm text-ink-70">Changes apply to future orders. Existing orders keep their original delivery address.</p>}
  {state&&<p role="status" className="text-sm">{state.success?'Address saved. You can return to checkout.':state.error}</p>}
  <button disabled={busy} className="bg-ink px-5 py-3 text-sm font-semibold text-white">{busy?'Saving…':'Save address'}</button>
 </form>;
}
export function DeleteAddressForm({id}:{id:string}) {
 const [state,action,busy]=useActionState(deleteCustomerAddress,null);
 return <form action={action} onSubmit={event=>{if(!window.confirm('Remove this saved address? Existing orders will keep their delivery details.'))event.preventDefault();}}>
  <input type="hidden" name="id" value={id}/><button disabled={busy} className="text-sm text-rust disabled:opacity-50">{busy?'Removing…':'Remove'}</button>
  {state&&!state.success&&<p role="alert" className="mt-2 text-sm text-rust">{state.error}</p>}
 </form>;
}
export function RequestForm({orderId=""}:{orderId?:string}){const [state,action,busy]=useActionState(submitCustomerRequest,null);const router=useRouter();useEffect(()=>{if(state?.success)router.refresh();},[state,router]);return <form action={action} className="mt-6 max-w-xl space-y-4 rounded-xl border border-line bg-panel p-6"><h2 className="text-xl font-semibold">How can we help?</h2><input type="hidden" name="orderId" value={orderId} /><label className="block text-sm">Request type<select name="kind" className="mt-2 w-full border border-line p-3"><option value="support">Support</option>{orderId&&<><option value="cancellation">Request cancellation</option><option value="return">Return or warranty issue</option></>}<option value="restock">Restock enquiry</option></select></label><label className="block text-sm">Subject<input name="subject" required minLength={2} maxLength={160} className="mt-2 w-full border border-line p-3" /></label><label className="block text-sm">Message<textarea required name="message" minLength={2} maxLength={5000} rows={5} className="mt-2 w-full border border-line p-3" /></label>{state&&<p role="status" className="text-sm">{state.success?"Your request was received. Updates will appear in Help & requests.":state.error}</p>}<button disabled={busy} className="bg-ink px-5 py-3 text-sm font-semibold text-white">{busy?"Sending…":"Send request"}</button></form>;}
export function SignOutButton(){const router=useRouter();return <button className="rounded-lg border border-line px-4 py-2 text-sm" onClick={async()=>{const {error}=await createBrowserSupabaseClient().auth.signOut();if(!error){router.push("/account/sign-in");router.refresh();}}}>Sign out</button>;}

export function ProfileForm({name,phone}:{name:string;phone:string}){const [state,action,busy]=useActionState(saveCustomerProfile,null);return <form action={action} className="mt-7 max-w-xl space-y-4 rounded-xl border border-line bg-panel p-6"><h2 className="text-xl font-semibold">Your profile</h2><label className="block text-sm">Full name<input required name="full_name" defaultValue={name} className="mt-2 w-full border border-line p-3" /></label><label className="block text-sm">Phone<input required name="phone" defaultValue={phone} className="mt-2 w-full border border-line p-3" /></label>{state&&<p role="status">{state.success?"Profile saved.":state.error}</p>}<button disabled={busy} className="bg-ink px-5 py-3 text-sm font-semibold text-white">{busy?"Saving…":"Save profile"}</button></form>;}
export function ReviewForm({orderId,items}:{orderId:string;items:{variant_id:string;product_name:string}[]}){const [state,action,busy]=useActionState(submitCustomerReview,null);return <form action={action} className="mt-7 space-y-4 rounded-xl border border-line bg-panel p-6"><h2 className="text-xl font-semibold">How was your purchase?</h2><input type="hidden" name="orderId" value={orderId}/><label className="block text-sm">Product<select name="variantId" className="mt-2 w-full border border-line p-3">{items.filter((item,index)=>items.findIndex(other=>other.variant_id===item.variant_id)===index).map(item=><option key={item.variant_id} value={item.variant_id}>{item.product_name}</option>)}</select></label><label className="block text-sm">Rating<select name="rating" className="mt-2 w-full border border-line p-3">{[5,4,3,2,1].map(value=><option key={value} value={value}>{value} stars</option>)}</select></label><label className="block text-sm">Review<textarea name="body" minLength={3} required rows={4} className="mt-2 w-full border border-line p-3" /></label>{state&&<p role="status">{state.success?"Thank you. Your review will appear after moderation.":state.error}</p>}<button disabled={busy||state?.success} className="bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Sending…":"Submit review"}</button></form>;}
