"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { receiveSerializedUnit, receiveQuantityStock, recordPhysicalSale } from "@/app/admin/actions";

type Option = { id: string; label: string };

function Result({ state }: { state: { success: boolean; error?: string } | null }) {
  return state && !state.success ? <p role="alert" className="text-sm text-rust">{state.error}</p> : null;
}

export function SerializedIntakeForm({ variants }: { variants: Option[] }) {
  const [state, action, pending] = useActionState(receiveSerializedUnit, null);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.push(state.data.href); }, [state, router]);
  return <form action={action} className="space-y-3 rounded-xl border border-line bg-panel p-5">
    <h2 className="font-semibold">Receive a tracked unit</h2>
    <select required name="variantId" className="w-full rounded-lg border border-line p-2 text-sm"><option value="">Choose variant</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
    <input name="imei" placeholder="IMEI, if applicable" className="w-full rounded-lg border border-line p-2 text-sm" />
    <input name="serialNumber" placeholder="Serial number, if applicable" className="w-full rounded-lg border border-line p-2 text-sm" />
    <input name="conditionGrade" placeholder="Condition grade" className="w-full rounded-lg border border-line p-2 text-sm" />
    <input name="batteryHealth" type="number" min="0" max="100" placeholder="Battery health %" className="w-full rounded-lg border border-line p-2 text-sm" />
    <Result state={state} /><button disabled={pending || !variants.length} className="bg-ink px-4 py-2 text-sm text-white">{pending ? "Receiving…" : "Receive unit"}</button>
  </form>;
}

export function QuantityIntakeForm({ variants }: { variants: Option[] }) {
  const [state, action, pending] = useActionState(receiveQuantityStock, null);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.push(state.data.href); }, [state, router]);
  return <form action={action} className="space-y-3 rounded-xl border border-line bg-panel p-5">
    <h2 className="font-semibold">Receive quantity stock</h2>
    <select required name="variantId" className="w-full rounded-lg border border-line p-2 text-sm"><option value="">Choose variant</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
    <input required name="quantity" type="number" min="1" max="1000" placeholder="Units received" className="w-full rounded-lg border border-line p-2 text-sm" />
    <Result state={state} /><button disabled={pending || !variants.length} className="bg-ink px-4 py-2 text-sm text-white">{pending ? "Receiving…" : "Receive stock"}</button>
  </form>;
}

export function SaleForm({ items, variants, kind }: { items: Option[]; variants: Option[]; kind: "unit" | "quantity" }) {
  const [state, action, pending] = useActionState(recordPhysicalSale, null);
  const [key] = useState(() => crypto.randomUUID());
  const router = useRouter();
  useEffect(() => { if (state?.success) router.push(state.data.href); }, [state, router]);
  const options = kind === "unit" ? items : variants;
  return <form action={action} className="space-y-3 rounded-xl border border-line bg-panel p-5">
    <input type="hidden" name="idempotencyKey" value={key} />
    <h2 className="font-semibold">{kind === "unit" ? "Sell a tracked unit" : "Sell quantity stock"}</h2>
    <select required name={kind === "unit" ? "inventoryItemId" : "variantId"} className="w-full rounded-lg border border-line p-2 text-sm"><option value="">Choose {kind === "unit" ? "available unit" : "variant"}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
    {kind === "quantity" && <input required name="quantity" type="number" min="1" max="1000" defaultValue="1" className="w-full rounded-lg border border-line p-2 text-sm" />}
    <textarea name="notes" placeholder="Sale notes (optional)" className="w-full rounded-lg border border-line p-2 text-sm" />
    <p className="text-xs text-ink-45">Confirm payment has been collected before recording this sale. Price is taken from the current variant in the database.</p>
    <Result state={state} /><button disabled={pending || !options.length || !key} className="bg-ink px-4 py-2 text-sm text-white">{pending ? "Recording…" : "Record paid sale"}</button>
  </form>;
}
