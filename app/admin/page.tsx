import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminMetrics, lowStockAlerts, recentOrders } from "@/lib/mock/admin";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const preview = !getSupabasePublicEnv();
  const supabase = preview ? null : await createServerSupabaseClient();
  const [ordersResult, variantsResult] = supabase ? await Promise.all([
    supabase.from("orders").select("order_number,status,total_amount,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("product_variants").select("sku,quantity,is_serialized").eq("is_serialized", false),
  ]) : [{ data: [] }, { data: [] }];
  const orders = ordersResult.data ?? [];
  const lowStock = (variantsResult.data ?? []).filter((variant) => variant.quantity <= 3);
  const metrics = preview ? adminMetrics : [
    { label: "Recorded sales", value: formatNaira(orders.filter((order) => ["paid", "fulfilled"].includes(order.status)).reduce((sum, order) => sum + order.total_amount, 0)) },
    { label: "Orders", value: String(orders.length) },
    { label: "Pending orders", value: String(orders.filter((order) => order.status === "pending").length), tone: "info" as const },
    { label: "Low stock", value: String(lowStock.length), tone: "warn" as const },
  ];
  const displayedOrders = preview ? recentOrders.map((order) => ({ orderNumber: order.orderNumber, customer: order.customer, totalKobo: order.totalKobo, status: order.status })) : orders.slice(0, 5).map((order) => ({ orderNumber: order.order_number, customer: "—", totalKobo: order.total_amount, status: order.status }));
  const displayedAlerts = preview ? lowStockAlerts : lowStock.map((variant) => ({ name: variant.sku, remaining: variant.quantity }));
  return (
    <div className="px-4 py-4 md:px-[30px] md:py-[26px]">
      <div className="mb-[22px] flex items-center justify-between">
        <h1 className="text-[19px] font-semibold">Dashboard</h1>
        <div className="text-xs text-ink-45">{preview ? "Design preview · Sample data" : "Live workspace"}</div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-line bg-panel px-4 py-3.5">
            <div className="mb-1.5 text-[11px] text-ink-45">{metric.label}</div>
            <div
              className={cn(
                "font-heading text-xl font-bold",
                metric.tone === "info" && "text-blue",
                metric.tone === "warn" && "text-rust",
              )}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-line bg-panel">
          <h3 className="border-b border-line px-4 py-3.5 text-[13.5px] font-semibold">
            Recent orders
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedOrders.map((order) => (
                <TableRow key={order.orderNumber}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{formatNaira(order.totalKobo)}</TableCell>
                  <TableCell>
                    <span className="capitalize">{order.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section className="rounded-xl border border-line bg-panel">
          <h3 className="border-b border-line px-4 py-3.5 text-[13.5px] font-semibold">
            Low stock alerts
          </h3>
          {displayedAlerts.map((alert) => (
            <div
              key={alert.name}
              className="flex justify-between border-b border-line px-4 py-2.5 text-[12.5px]"
            >
              <span>{alert.name}</span>
              <span className="font-semibold text-rust">
                {alert.remaining === 0 ? "0 left" : `${alert.remaining} left`}
              </span>
            </div>
          ))}
        </section>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className="rounded-lg bg-ink px-4 py-3 font-semibold text-white">View all orders</Link>
        <Link href="/admin/inventory" className="rounded-xl border border-line bg-panel px-4 py-3 font-semibold">Review low stock</Link>
        <Link href="/admin/sale" className="rounded-xl border border-line bg-panel px-4 py-3 font-semibold">Record a sale</Link>
      </div>
    </div>
  );
}
