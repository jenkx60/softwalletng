import type {
  AdminMetric,
  AdminOrderRow,
  LowStockAlert,
} from "@/types/inventory";

export const adminMetrics: AdminMetric[] = [
  { label: "Today's sales", value: "₦1.24M" },
  { label: "Orders", value: "18" },
  { label: "Pending orders", value: "4", tone: "info" },
  { label: "Low stock", value: "6", tone: "warn" },
  { label: "Out of stock", value: "2", tone: "warn" },
];

export const recentOrders: AdminOrderRow[] = [
  {
    orderNumber: "SW-10482",
    customer: "Amaka Obi",
    totalKobo: 63_700_000,
    status: "paid",
  },
  {
    orderNumber: "SW-10481",
    customer: "Tobi A.",
    totalKobo: 115_000_000,
    status: "pending",
  },
  {
    orderNumber: "SW-10480",
    customer: "Ngozi E.",
    totalKobo: 21_000_000,
    status: "paid",
  },
];

export const lowStockAlerts: LowStockAlert[] = [
  { name: "iPhone 12 128GB — New", remaining: 1 },
  { name: "Galaxy S24 Ultra", remaining: 2 },
  { name: "PS5 Slim Console", remaining: 0 },
  { name: "AirPods Pro 2", remaining: 3 },
];
