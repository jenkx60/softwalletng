import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import type { OrderSummaryLine } from "@/types/commerce";

export function OrderSummary({
  lines,
  subtotalKobo,
  deliveryLabel = "Calculated at checkout",
  totalLabel = "Estimated total",
  note,
  actionLabel,
  actionHref,
  showDiscount = false,
  sticky = false,
}: {
  lines?: OrderSummaryLine[];
  subtotalKobo: number;
  deliveryLabel?: string;
  totalLabel?: string;
  note?: string;
  actionLabel?: string;
  actionHref?: string;
  showDiscount?: boolean;
  sticky?: boolean;
}) {
  return (
    <aside
      className={`rounded-xl border border-line bg-panel p-[22px] ${sticky ? "lg:sticky lg:top-5" : ""}`}
    >
      <h3 className="mb-4 text-[15px] font-semibold">Order summary</h3>
      {lines?.map((line) => (
        <div
          key={line.label}
          className="flex justify-between py-1.5 text-[12.5px] text-ink-70"
        >
          <span>
            {line.label} × {line.quantity}
          </span>
        </div>
      ))}
      {showDiscount ? (
        <div className="my-3.5 flex gap-2">
          <Input placeholder="Discount code" className="h-9 rounded-lg text-[12.5px]" />
          <Button variant="outline" size="sm" className="h-9 rounded-lg px-3.5">
            Apply
          </Button>
        </div>
      ) : null}
      <div className="flex justify-between py-1.5 text-[13.5px] text-ink-70">
        <span>Subtotal</span>
        <span>{formatNaira(subtotalKobo)}</span>
      </div>
      <div className="flex justify-between py-1.5 text-[13.5px] text-ink-70">
        <span>Delivery</span>
        <span>{deliveryLabel}</span>
      </div>
      <div className="mt-2 flex justify-between border-t border-line pt-3.5 text-[15px] font-bold">
        <span>{totalLabel}</span>
        <span>{formatNaira(subtotalKobo)}</span>
      </div>
      {note ? <p className="mt-2 text-[11.5px] text-ink-45">{note}</p> : null}
      {actionLabel && actionHref ? (
        <Button
          nativeButton={false}
          render={<Link href={actionHref} />}
          className="mt-4 h-11 w-full rounded-lg text-sm font-semibold"
        >
          {actionLabel}
        </Button>
      ) : actionLabel ? (
        <Button className="mt-4 h-11 w-full rounded-lg text-sm font-semibold">
          {actionLabel}
        </Button>
      ) : null}
    </aside>
  );
}
