import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart, User } from "lucide-react";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=phones", label: "Phones" },
  { href: "/shop?category=laptops", label: "Laptops" },
  { href: "/shop?category=gaming", label: "Gaming" },
  { href: "/shop?category=audio", label: "Audio" },
];

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center font-heading text-xl font-bold tracking-tight ${inverted ? "text-white" : "text-ink"}`}
    >
      <Image
        src="/brand/logo-icon.png"
        alt=""
        width={20}
        height={27}
        className="mr-2 h-[1.05em] w-auto"
      />
      Softwallet
    </Link>
  );
}

export function SiteHeader({
  variant = "full",
  breadcrumb,
}: {
  variant?: "full" | "logo-only" | "breadcrumb";
  breadcrumb?: string;
}) {
  if (variant === "logo-only") {
    return (
      <header className="border-b border-line">
        <div className="page-container flex items-center py-[18px]">
          <Logo />
        </div>
      </header>
    );
  }

  if (variant === "breadcrumb") {
    return (
      <header className="border-b border-line">
        <div className="page-container flex items-center gap-2.5 py-4 text-[12.5px] text-ink-45">
          <Link href="/" className="hover:text-ink">
            Shop
          </Link>
          <span>/</span>
          {breadcrumb ? <span className="text-ink">{breadcrumb}</span> : null}
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="page-container flex items-center gap-8 py-[18px]">
        <Logo />
        <nav className="hidden flex-1 items-center gap-[26px] text-sm text-ink-70 md:flex">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <details className="relative md:hidden"><summary className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm">Menu</summary><nav className="absolute right-0 z-20 mt-2 w-48 space-y-3 rounded-xl border border-line bg-panel p-4 shadow-soft">{navLinks.map(link=><Link key={link.href} href={link.href} className="block text-sm">{link.label}</Link>)}<Link href="/account/orders" className="block text-sm">My orders</Link><Link href="/account/help" className="block text-sm">Help</Link></nav></details><div className="ml-auto flex items-center gap-[18px] text-ink">
          <Link href="/shop" aria-label="Search products"><Search className="size-[18px]" aria-hidden /></Link>
          <Link href="/cart" aria-label="Cart">
            <ShoppingCart className="size-[18px]" />
          </Link>
          <Link href="/account" aria-label="Account">
            <User className="size-[18px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
