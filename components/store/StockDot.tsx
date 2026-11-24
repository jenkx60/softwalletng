import type { StockLevel } from "@/types/catalogue";
import { cn } from "@/lib/utils";

const tones: Record<StockLevel, string> = {
  in: "bg-blue",
  low: "bg-blue-dark",
  out: "bg-rust",
};

export function StockDot({
  level,
  label,
  className,
}: {
  level: StockLevel;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] text-ink-70", className)}>
      <span className={cn("size-1.5 rounded-full", tones[level])} />
      {label}
    </span>
  );
}
