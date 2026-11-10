import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { ActionResult, AppRole } from "@/types/auth";

export async function requireRole(
  allowed: AppRole[],
): Promise<ActionResult<{ userId: string; roles: AppRole[] }>> {
  if (!getSupabasePublicEnv()) {
    return { success: false, error: "Authentication is not configured." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You need to sign in to continue." };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Could not verify your role." };
  }

  const roles = (data ?? []).map((row) => row.role as AppRole);
  const permitted = roles.some((role) => allowed.includes(role));

  if (!permitted) {
    return { success: false, error: "You do not have permission for this action." };
  }

  return { success: true, data: { userId: user.id, roles } };
}
