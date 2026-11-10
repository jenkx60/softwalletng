"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/SiteHeader";

const groups = [
  { label: "Workspace", links: [["/admin", "Dashboard"]] },
  { label: "Catalogue", links: [["/admin/products", "Products"], ["/admin/categories", "Categories"], ["/admin/brands", "Brands"]] },
  { label: "Inventory", links: [["/admin/inventory", "Inventory"], ["/admin/movements", "Inventory movements"], ["/admin/sale", "Record sale"]] },
  { label: "Sales", links: [["/admin/orders", "Orders"], ["/admin/support", "Customer support"], ["/admin/customers", "Customers"], ["/admin/discounts", "Discounts"]] },
  { label: "Content", links: [["/admin/reviews", "Reviews"], ["/admin/delivery", "Delivery"]] },
  { label: "System", links: [["/admin/staff", "Staff & roles"], ["/admin/audit", "Audit log"], ["/admin/settings", "Settings"]] },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar py-5 text-sidebar-foreground">
      <div className="px-5 pb-5"><Logo inverted /></div>
      <nav aria-label="Admin navigation" className="grid grid-cols-2 md:block">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-5 pt-4 pb-1.5 text-[10.5px] tracking-[0.06em] text-white/40 uppercase">{group.label}</div>
            {group.links.map(([href, label]) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`mx-2 block rounded-lg px-3 py-2.5 text-[13px] ${pathname === href ? "rounded-lg border-l-[3px] border-blue bg-white/8 font-semibold text-white" : "text-white/75 hover:text-white"}`}>{label}</Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
