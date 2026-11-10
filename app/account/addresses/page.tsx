import Link from "next/link";
import { requireCustomer } from "@/lib/auth/customer";
import { CustomerShell } from "@/components/CustomerShell";
import { AddressForm, DeleteAddressForm } from "@/components/CustomerForms";
export default async function Page({searchParams}:{searchParams:Promise<{edit?:string}>}) {
 const {edit}=await searchParams;
 const {user,db}=await requireCustomer("/account/addresses");
 const {data,error}=await db.from("addresses").select("id,recipient_name,line1,city,state,phone").eq("user_id",user.id).order("created_at",{ascending:false});
 const selected=data?.find(address=>address.id===edit);
 return <CustomerShell title="Your delivery addresses">
  {error&&<p role="alert">Addresses could not be loaded. Please refresh.</p>}
  {!error&&!data?.length&&<p className="text-ink-70">Add your first delivery address below.</p>}
  <div className="grid gap-4 md:grid-cols-2">{data?.map(address=><article key={address.id} className="rounded-xl border border-line bg-panel p-5">
   <h2 className="font-semibold">{address.recipient_name}</h2><p className="mt-2 text-sm">{address.line1}, {address.city}, {address.state}<br/>{address.phone}</p>
   <div className="mt-4 flex gap-5"><Link href={`/account/addresses?edit=${address.id}`} className="text-sm text-blue">Edit</Link><DeleteAddressForm id={address.id}/></div>
  </article>)}</div>
  <AddressForm key={selected?.id??'new'} address={selected}/>
  {selected&&<Link href="/account/addresses" className="mt-4 block text-sm text-blue">Add a different address</Link>}
  <Link href="/checkout" className="mt-5 inline-block text-blue">Return to checkout →</Link>
 </CustomerShell>;
}
