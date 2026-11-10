export const INVENTORY_STATUSES = [
  "available",
  "reserved",
  "sold",
  "damaged",
  "returned",
  "trade_in_pending",
  "removed",
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export type AdminMetric = {
  label: string;
  value: string;
  tone?: "default" | "info" | "warn";
};

export type AdminOrderRow = {
  orderNumber: string;
  customer: string;
  totalKobo: number;
  status: "paid" | "pending";
};

export type LowStockAlert = {
  name: string;
  remaining: number;
};
