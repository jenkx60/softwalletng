"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { confirmedOrder } from "@/lib/mock/cart";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/commerce";

export function PaymentStatusView({
  initialStatus,
}: {
  initialStatus: PaymentStatus;
}) {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);

  return (
    <div className="mx-auto max-w-[480px] px-5 py-[90px] text-center">
      <div className="mb-5 flex justify-center gap-1.5">
        {(["processing", "success", "failed"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11.5px]",
              status === item
                ? "border-ink bg-ink text-white"
                : "border-line bg-white",
            )}
          >
            {item === "processing"
              ? "Processing"
              : item === "success"
                ? "Success"
                : "Failed"}
          </button>
        ))}
      </div>

      {status === "processing" ? (
        <div>
          <div className="mx-auto mb-[22px] flex size-16 items-center justify-center rounded-full bg-blue-tint text-blue">
            <div className="size-[26px] animate-spin rounded-full border-[3px] border-blue-tint border-t-blue" />
          </div>
          <h1 className="mb-2.5 text-[22px] font-semibold">
            Confirming your payment…
          </h1>
          <p className="text-sm leading-[1.6] text-ink-70">
            Paystack has received your payment — we&apos;re verifying it now.
            This usually takes a few seconds, please don&apos;t close this page.
          </p>
        </div>
      ) : null}

      {status === "success" ? (
        <div>
          <div className="mx-auto mb-[22px] flex size-16 items-center justify-center rounded-full bg-blue-tint text-blue-dark">
            <Check className="size-6" />
          </div>
          <h1 className="mb-2.5 text-[22px] font-semibold">Order confirmed</h1>
          <p className="mb-[26px] text-sm leading-[1.6] text-ink-70">
            Payment verified and your order is placed. A confirmation has been
            sent to your email.
          </p>
          <div className="mb-[26px] rounded-xl border border-line bg-panel p-[18px] text-left">
            <div className="flex justify-between py-1 text-[13px]">
              <span>Order number</span>
              <strong>{confirmedOrder.orderNumber}</strong>
            </div>
            <div className="flex justify-between py-1 text-[13px]">
              <span>Amount paid</span>
              <strong>{formatNaira(confirmedOrder.amountKobo)}</strong>
            </div>
            <div className="flex justify-between py-1 text-[13px]">
              <span>Estimated delivery</span>
              <strong>{confirmedOrder.deliveryEstimate}</strong>
            </div>
          </div>
          <Button className="h-11 w-full rounded-lg text-sm font-semibold">
            View order
          </Button>
        </div>
      ) : null}

      {status === "failed" ? (
        <div>
          <div className="mx-auto mb-[22px] flex size-16 items-center justify-center rounded-full bg-rust-tint text-rust">
            <X className="size-6" />
          </div>
          <h1 className="mb-2.5 text-[22px] font-semibold">
            Payment didn&apos;t go through
          </h1>
          <p className="mb-[26px] text-sm leading-[1.6] text-ink-70">
            Your card wasn&apos;t charged. This can happen with a declined card
            or a network timeout — your cart has been saved, nothing was lost.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/checkout" />}
            className="h-11 w-full rounded-lg text-sm font-semibold"
          >
            Try payment again
          </Button>
          <div className="mt-3.5 text-[13px]">
            <Link href="/" className="font-semibold text-blue">
              Contact support
            </Link>{" "}
            if this keeps happening
          </div>
        </div>
      ) : null}
    </div>
  );
}
