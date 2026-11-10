// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
// import { getSupabasePublicEnv } from "@/lib/supabase/env";

// export async function createServerSupabaseClient() {
//   const env = getSupabasePublicEnv();
//   if (!env) {
//     throw new Error(
//       "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
//     );
//   }

//   const cookieStore = await cookies();

//   return createServerClient(env.url, env.anonKey, {
//     cookies: {
//       getAll() {
//         return cookieStore.getAll();
//       },
//       setAll(cookiesToSet) {
//         try {
//           cookiesToSet.forEach(({ name, value, options }) => {
//             cookieStore.set(name, value, options);
//           });
//         } catch {
//           // Called from a Server Component — middleware will refresh the session.
//         }
//       },
//     },
//   });
// }



import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("Supabase authentication is not configured.");
  const cookieStore = await cookies();

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie writes from Server Components
            // require handling through the auth proxy.
          }
        },
      },
    }
  );
}

export const createServerSupabaseClient = createClient;
