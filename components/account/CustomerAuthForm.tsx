"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function CustomerAuthForm({register=false,next="/account"}:{register?:boolean;next?:string}){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const router=useRouter();
 async function submit(){
  setBusy(true);setMessage("");try{
   const db=createBrowserSupabaseClient();
   if(register){const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:`${window.location.origin}/auth/callback`}});if(error)throw error;if(!data.session){setMessage("Check your inbox to confirm your email, then sign in. Open the link in this browser.");return;}}
   else{const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;}
   router.push(next.startsWith("/")&&!next.startsWith("//")&&!next.includes("\\")?next:"/account");router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:"Sign-in failed. Try again.");}finally{setBusy(false);}
 }
 return <form onSubmit={event=>{event.preventDefault();void submit();}} className="mx-auto w-full max-w-md space-y-5 rounded-xl border border-line bg-panel p-7"><h1 className="text-2xl font-semibold">{register?"Create your Softwallet account":"Welcome back"}</h1>{register&&<label className="block text-sm">Full name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-2 w-full border border-line p-3" /></label>}<label className="block text-sm">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full border border-line p-3" /></label><label className="block text-sm">Password<input required type="password" minLength={register?12:1} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?"new-password":"current-password"} className="mt-2 w-full border border-line p-3" /></label>{register&&<p className="text-xs text-ink-70">Use at least 12 characters.</p>}{message&&<p role="status" className="text-sm text-rust">{message}</p>}<button disabled={busy} className="w-full bg-ink p-3 font-semibold text-white disabled:opacity-50">{busy?"Please wait…":register?"Create account":"Sign in"}</button><Link href="/auth/recover" className="block text-sm text-blue">Forgot your password?</Link><Link href={register?`/account/sign-in?next=${encodeURIComponent(next)}`:`/account/register?next=${encodeURIComponent(next)}`} className="block text-sm text-blue">{register?"Already have an account? Sign in":"New to Softwallet? Create an account"}</Link></form>;
}
