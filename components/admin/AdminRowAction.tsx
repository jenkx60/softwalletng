"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { approveReview, fulfillOrder, toggleAdminRecord } from "@/app/admin/actions";

export function AdminRowAction({ kind, id, active }: { kind: "review" | "order" | "discount" | "delivery"; id: string; active?: boolean }) {
  const [state, action, pending] = useActionState(kind === "review" ? approveReview : kind === "order" ? fulfillOrder : toggleAdminRecord, null);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return <form action={action} className="flex items-center gap-2">
    <input type="hidden" name={kind === "review" ? "reviewId" : kind === "order" ? "orderId" : "recordId"} value={id} />
    {(kind === "discount" || kind === "delivery") && <><input type="hidden" name="kind" value={kind} /><input type="hidden" name="active" value={String(active)} /></>}
    <button disabled={pending} className="text-sm font-semibold text-blue disabled:opacity-50">{pending ? "Saving…" : kind === "review" ? "Approve" : kind === "order" ? "Fulfill" : active ? "Deactivate" : "Activate"}</button>
    {state && !state.success && <span role="alert" className="text-xs text-rust">{state.error}</span>}
  </form>;
}
