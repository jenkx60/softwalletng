export const APP_ROLES = [
  "customer",
  "sales_staff",
  "inventory_manager",
  "order_manager",
  "super_admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES: AppRole[] = [
  "sales_staff",
  "inventory_manager",
  "order_manager",
  "super_admin",
];

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
