import Link from "next/link";
import { Logo } from "@/components/SiteHeader";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop?category=phones", label: "Phones" },
      { href: "/shop?category=laptops", label: "Laptops" },
      { href: "/shop?category=gaming", label: "Gaming" },
      { href: "/shop?category=audio", label: "Audio" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Delivery info" },
      { href: "/help", label: "Returns" },
      { href: "/help", label: "FAQ" },
      { href: "/account/help", label: "Contact" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/account", label: "My account" },
      { href: "/account/orders", label: "My orders" },
      { href: "/account/addresses", label: "Delivery addresses" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-[13px] text-white/70">
      <div className="page-container py-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo inverted />
            <p className="mt-2.5 max-w-[280px] text-white/75">
              Computer Village, Ikeja, Lagos. New and UK-used electronics,
              verified before they&apos;re listed.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-[13px] font-semibold text-white">
                {column.title}
              </h4>
              <div className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[30px] border-t border-white/12 pt-5 text-xs text-white/60">
          © Softwallet. Computer Village, Ikeja.
        </div>
      </div>
    </footer>
  );
}
