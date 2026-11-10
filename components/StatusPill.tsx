import { cn } from "@/lib/utils";

export function StatusPill({
  status,
}: {
  status: "paid" | "pending";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
        status === "paid" && "bg-blue-tint text-blue",
        status === "pending" && "bg-blue-tint text-blue-dark",
      )}
    >
      {status === "paid" ? "Paid" : "Pending"}
    </span>
  );
}
