// import { createBrowserClient } from "@supabase/ssr";
// import { getSupabasePublicEnv } from "@/lib/supabase/env";

// export function createBrowserSupabaseClient() {
//   const env = getSupabasePublicEnv();
//   if (!env) {
//     throw new Error(
//       "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
//     );
//   }

//   return createBrowserClient(env.url, env.anonKey);
// }



import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("Supabase authentication is not configured.");
  return createBrowserClient(env.url, env.anonKey);
}

export const createBrowserSupabaseClient = createClient;
