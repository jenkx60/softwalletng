import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ConditionTagVariant = "new" | "used" | "out" | "sale";

const labels: Record<ConditionTagVariant, string> = {
  new: "New",
  used: "UK Used",
  out: "Out of stock",
  sale: "Offer",
};

export function ConditionTag({
  variant,
  size = "md",
  children,
  className,
}: {
  variant: ConditionTagVariant;
  size?: "sm" | "md";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "condition-tag",
        variant === "used" && "condition-tag-used",
        variant === "out" && "condition-tag-out",
        size === "sm" && "condition-tag-sm",
        className,
      )}
    >
      {children ?? labels[variant]}
    </span>
  );
}
