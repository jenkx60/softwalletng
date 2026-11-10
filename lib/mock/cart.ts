import type { Address, CartLine, ConfirmedOrder } from "@/types/commerce";

export const cartLines: CartLine[] = [
  {
    id: "iphone-13-pro-256gb",
    name: "iPhone 13 Pro 256GB",
    priceKobo: 62_000_000,
    quantity: 1,
    condition: "uk_used",
    meta: "Graphite",
    available: true,
  },
  {
    id: "fast-charger-20w",
    name: "Fast Charger 20W",
    priceKobo: 1_700_000,
    quantity: 2,
    condition: null,
    meta: "Type-C",
    available: true,
  },
  {
    id: "ps5-slim-console",
    name: "PS5 Slim Console",
    priceKobo: 71_000_000,
    quantity: 1,
    condition: null,
    meta: "",
    available: false,
    warning: "This unit sold while it was in your cart — sorry! Remove to continue.",
  },
];

export const cartSubtotalKobo = 63_700_000;

export const checkoutAddress: Address = {
  recipientName: "Amaka Obi",
  phone: "08012345678",
  line1: "14 Allen Avenue",
  city: "Ikeja",
  state: "Lagos",
  isDefault: true,
};

export const confirmedOrder: ConfirmedOrder = {
  orderNumber: "SW-10482",
  amountKobo: 63_700_000,
  deliveryEstimate: "2–4 business days",
};
