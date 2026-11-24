import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriceDisplay({
  kobo,
  compareAtKobo,
  className,
  size = "md",
}: {
  kobo: number;
  compareAtKobo?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "text-[13px]",
    md: "text-[15px]",
    lg: "text-[26px]",
  }[size];

  return (
    <div className={cn("font-bold", sizeClass, className)}>
      {compareAtKobo && compareAtKobo > kobo ? (
        <span className="mr-1.5 font-normal text-ink-45 line-through">
          {formatNaira(compareAtKobo)}
        </span>
      ) : null}
      <span>{formatNaira(kobo)}</span>
    </div>
  );
}
