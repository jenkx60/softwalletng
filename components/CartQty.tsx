"use client";

import { useState } from "react";

export function CartQty({ initial }: { initial: number }) {
  const [qty, setQty] = useState(initial);

  return (
    <div className="mt-2.5 flex w-fit items-center rounded-lg border border-line">
      <button
        type="button"
        className="size-[26px] text-sm"
        onClick={() => setQty((current) => Math.max(1, current - 1))}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-7 text-center text-[13px]">{qty}</span>
      <button
        type="button"
        className="size-[26px] text-sm"
        onClick={() => setQty((current) => current + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
