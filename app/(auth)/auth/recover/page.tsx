"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function recover() {
    setBusy(true);
    const { error } = await createBrowserSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/set-password` });
    setBusy(false);
    setMessage(error ? error.message : "If this account exists, a password reset link has been sent. Open the newest link in this browser.");
  }
  return <main className="mx-auto w-full max-w-md flex-1 px-5 py-16"><h1 className="text-2xl font-semibold">Reset password</h1><p className="mt-3 text-sm text-ink-70">Enter your account email to receive a reset link.</p><p className="mt-3 text-sm text-ink-70">Open this page in the same browser where you read your email. The reset link is tied to that browser.</p><form onSubmit={(event) => { event.preventDefault(); void recover(); }} className="mt-7 space-y-4"><label className="block text-sm font-medium">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3" /></label><button disabled={busy} className="bg-ink px-5 py-3 text-sm font-semibold text-white">{busy ? "Sending…" : "Send reset link"}</button></form>{message && <p role="status" className="mt-4 text-sm">{message}</p>}</main>;
}
