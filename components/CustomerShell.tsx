import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
export function CustomerShell({title,children}:{title:string;children:ReactNode}){return <><SiteHeader /><main className="page-container flex-1 py-10"><nav aria-label="Account" className="mb-7 flex flex-wrap gap-3 text-sm text-blue"><Link href="/account">My account</Link><Link href="/account/orders">My orders</Link><Link href="/account/addresses">Addresses</Link><Link href="/account/help">Help & requests</Link></nav><h1 className="mb-7 text-3xl font-semibold">{title}</h1>{children}</main></>;}
