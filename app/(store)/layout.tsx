import type { ReactNode } from "react";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-paper">{children}</div>;
}
