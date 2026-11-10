import type { ConditionKind } from "@/types/catalogue";

export type CartLine = {
  id: string;
  name: string;
  priceKobo: number;
  quantity: number;
  condition: ConditionKind | null;
  meta: string;
  available: boolean;
  warning?: string;
};

export type Address = {
  recipientName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export type OrderSummaryLine = {
  label: string;
  quantity: number;
};

export type PaymentStatus = "processing" | "success" | "failed";

export type ConfirmedOrder = {
  orderNumber: string;
  amountKobo: number;
  deliveryEstimate: string;
};
