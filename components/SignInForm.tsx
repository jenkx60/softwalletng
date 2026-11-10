"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!getSupabasePublicEnv()) {
      setError("Authentication is not configured yet.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex flex-col justify-center px-[22px] py-[30px] md:px-14 md:py-[60px]">
      <h1 className="mb-1.5 text-2xl font-semibold">Staff sign in</h1>
      <p className="mb-6 text-[13.5px] text-ink-45">Use your Softwallet staff account.</p>
          <div className="mb-4">
            <Label className="mb-1.5 text-xs font-semibold text-ink-45">
              Email address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="h-11 rounded-lg text-[13.5px]"
            />
          </div>
          <div className="mb-4">
            <Label className="mb-1.5 text-xs font-semibold text-ink-45">
              Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-lg text-[13.5px]"
            />
          </div>
          {error && <p role="alert" className="mb-3 text-sm text-rust">{error}</p>}
          <Button
            type="button"
            disabled={busy || !email || !password}
            onClick={signIn}
            className="h-11 w-full rounded-lg text-sm font-semibold"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
      <p className="mt-5 text-center text-[13px] text-ink-70">
        <Link href="/auth/recover" className="font-semibold text-blue">
          Forgot your password?{" "}
        </Link>
      </p>
    </div>
  );
}
