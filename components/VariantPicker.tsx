"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function VariantPicker({
  label,
  options,
  initial,
}: {
  label: string;
  options: string[];
  initial: string;
}) {
  const [selected, setSelected] = useState(initial);

  if (options.length === 0) return null;

  return (
    <div className="mb-5">
      <label className="mb-2 block text-xs font-semibold tracking-wide text-ink-45 uppercase">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelected(option)}
            className={cn(
              "border-[1.5px] bg-white px-3.5 py-2 text-[13px] font-medium",
              selected === option ? "border-ink bg-ink text-white" : "border-line",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
