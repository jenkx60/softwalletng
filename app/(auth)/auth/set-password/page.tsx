"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const finish = async () => {
      // The browser client exchanges URL codes during initialization; a second
      // exchange consumes the already-used verifier and breaks valid links.
      const result = await supabase.auth.getSession();
      if (result.data.session) setReady(true);
      else setError("This link is expired or belongs to another browser. Request a new reset link and open it in the same browser.");
    };
    void finish();
  }, []);

  async function savePassword() {
    if (password.length < 12) { setError("Use at least 12 characters."); return; }
    setBusy(true);
    const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) { setError(updateError.message); return; }
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roles } = user ? await supabase.from("user_roles").select("role").eq("user_id",user.id) : {data:null};
    router.push(roles?.some(row=>row.role!=="customer")?"/admin":"/account");
    router.refresh();
  }

  return <main className="mx-auto w-full max-w-md flex-1 px-5 py-16">
    <h1 className="text-2xl font-semibold">Set your password</h1>
    <p className="mt-3 text-sm text-ink-70">Choose a new password for your Softwallet account.</p>
    {ready && <form onSubmit={(event) => { event.preventDefault(); void savePassword(); }} className="mt-7 space-y-4">
      <label className="block text-sm font-medium">New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-panel p-3" /></label>
      <button disabled={busy} className="bg-ink px-5 py-3 text-sm font-semibold text-white">{busy ? "Saving…" : "Set password"}</button>
    </form>}
    {error && <p role="alert" className="mt-5 text-sm text-rust">{error}</p>}
    {error && <Link href="/auth/recover" className="mt-3 inline-block text-sm font-semibold text-blue">Request another reset link</Link>}
  </main>;
}
