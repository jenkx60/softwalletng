import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 md:grid-cols-[220px_1fr]">
      <AdminSidebar />
      <div className="bg-paper">{children}</div>
    </div>
  );
}
