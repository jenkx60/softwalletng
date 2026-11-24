import { cn } from "@/lib/utils";

export function BatteryHealthBar({
  percent,
  className,
  trackClassName,
}: {
  percent: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("flex items-center gap-2 text-xs text-ink-70", className)}>
      <div
        className={cn(
          "h-1.5 flex-1 overflow-hidden rounded-lg bg-line",
          trackClassName,
        )}
      >
        <div
          className="h-full bg-blue"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span>{clamped}%</span>
    </div>
  );
}
