import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/supabase/env";

export function createServiceRoleClient() {
  const env = getSupabaseServiceEnv();
  if (!env) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or public Supabase env vars",
    );
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
