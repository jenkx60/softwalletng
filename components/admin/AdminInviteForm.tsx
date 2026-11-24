"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { inviteStaff } from "@/app/admin/actions";

export function AdminInviteForm() {
  const [state, action, pending] = useActionState(inviteStaff, null);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.push(state.data.href); }, [state, router]);
  return <form action={action} className="mt-6 max-w-2xl space-y-4 rounded-xl border border-line bg-panel p-6">
    <h2 className="font-semibold">Invite a new staff member</h2>
    <label className="block text-sm font-medium">Email<input required type="email" name="email" className="mt-1 w-full rounded-lg border border-line p-3" /></label>
    <label className="block text-sm font-medium">Role<select name="role" className="mt-1 w-full rounded-lg border border-line p-3"><option value="sales_staff">Sales staff</option><option value="inventory_manager">Inventory manager</option><option value="order_manager">Order manager</option><option value="super_admin">Super admin</option></select></label>
    {state && !state.success && <p role="alert" className="text-sm text-rust">{state.error}</p>}
    <button disabled={pending} className="bg-ink px-5 py-3 text-sm font-semibold text-white">{pending ? "Sending…" : "Send invitation"}</button>
  </form>;
}
