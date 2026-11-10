"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Battery, Check, Clock, MapPin, Route, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BatteryHealthBar } from "@/components/BatteryHealthBar";
import { ConditionTag } from "@/components/ConditionTag";
import { formatNaira } from "@/lib/format";

const SLIDE_COUNT = 4;
const INTERVAL_MS = 5500;

export function HeroCarousel({ live = false }: { live?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % (live ? 1 : SLIDE_COUNT));
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, live]);

  function go(next: number) { setIndex((next + SLIDE_COUNT) % SLIDE_COUNT); }

  return (
    <div className="relative overflow-hidden pt-6 pb-5 md:pt-11 md:pb-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex transition-transform duration-[600ms] ease-[cubic-bezier(.65,0,.35,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
        <SlideVerify />
        {!live && <SlideArrivals />}
        {!live && <SlideSale />}
        {!live && <SlideUsed />}
      </div>
      {!live && <div className="mt-1.5 flex items-center gap-3.5">
        <div className="flex gap-1.5">
          {Array.from({ length: SLIDE_COUNT }).map((_, slide) => (
            <button key={slide} type="button" aria-label={`Slide ${slide + 1}`} onClick={() => go(slide)} className={`h-[3px] w-[22px] border-0 p-0 ${slide === index ? "bg-blue" : "bg-line"}`} />
          ))}
        </div>
        <div className="ml-1 hidden gap-2 md:flex">
          <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="flex size-[30px] items-center justify-center rounded-full border border-line bg-white text-[15px] text-ink hover:border-ink">‹</button>
          <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="flex size-[30px] items-center justify-center rounded-full border border-line bg-white text-[15px] text-ink hover:border-ink">›</button>
        </div>
      </div>}
    </div>
  );
}

function SlideShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid min-w-full rounded-2xl items-center gap-6 md:gap-14 ${className ?? ""}`}>{children}</div>;
}

function SlideVerify() {
  return <SlideShell className="md:grid-cols-[1.05fr_.95fr]">
    <div>
      <h1 className="mb-[18px] text-[27px] leading-[1.08] font-semibold md:text-[44px]">Every device, verified<br />before it&apos;s yours.</h1>
      <p className="mb-[26px] max-w-[440px] text-[14.5px] leading-[1.55] text-ink-70 md:text-base">Condition graded, battery health checked, IMEI on record — so what you see online is exactly what turns up at your door, or the counter in Computer Village.</p>
      <HeroCtas primary={{ href: "/", label: "Shop new devices" }} secondary={{ href: "/", label: "Shop UK-used" }} />
      <TrustStrip items={[{ icon: MapPin, text: "Computer Village, Ikeja" }, { icon: Check, text: "IMEI verified on every device" }, { icon: Route, text: "Delivery nationwide" }]} />
    </div>
    <div className="relative order-first md:order-none">
      <div className="flex aspect-4/5 items-center justify-center rounded-2xl bg-linear-to-br from-[#1c3244] to-[#0c1822]">
        <svg viewBox="0 0 100 100" className="w-[46%] opacity-90" fill="none" stroke="#4B6377" strokeWidth="1.2"><rect x="32" y="10" width="36" height="80" rx="6" /><line x1="42" y1="18" x2="58" y2="18" /><circle cx="50" cy="82" r="3" /></svg>
      </div>
      <div className="absolute right-2 -bottom-[18px] w-[180px] rounded-xl border-l-4 border-blue bg-panel p-3.5 shadow-soft md:right-[-14px] md:bottom-9 md:w-[220px] md:p-4">
        <div className="mb-1 text-[11px] tracking-wide text-ink-45 uppercase">Condition — UK Used</div>
        <div className="mb-2 text-sm font-semibold">Grade A · Battery health</div>
        <BatteryHealthBar percent={91} />
      </div>
    </div>
  </SlideShell>;
}

function SlideArrivals() {
  return <SlideShell className="md:grid-cols-[1fr_.92fr] md:gap-10">
    <div>
      <h1 className="mb-[18px] text-[27px] leading-[1.08] font-semibold md:text-[44px]">Just landed in<br />Computer Village.</h1>
      <p className="mb-[26px] max-w-[440px] text-[14.5px] leading-[1.55] text-ink-70 md:text-base">This week&apos;s fresh stock — checked, graded, and ready to ship the same day.</p>
      <HeroCtas primary={{ href: "/", label: "See what's new" }} secondary={{ href: "/", label: "Shop laptops" }} />
      <TrustStrip items={[{ icon: Sparkles, text: "12 new listings this week" }, { icon: Check, text: "Checked before listing" }]} />
    </div>
    <div className="order-first grid grid-cols-2 gap-3 md:order-none">
      <ShelfCard name="Galaxy S24 Ultra" priceKobo={115_000_000} tag="new" />
      <ShelfCard name="MacBook Air M2" priceKobo={98_000_000} tag="used" />
      <div className="col-span-2 flex items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-2.5">
        <div className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-photo"><Sparkles className="w-[42%] text-[#B7BCB5]" /></div>
        <div className="flex-1"><div className="mb-0.5 text-[12.5px] font-semibold">AirPods Pro 2 <ConditionTag variant="new" size="sm" className="ml-1.5 align-middle" /></div><div className="text-[13px] font-bold text-ink-70">{formatNaira(15_900_000)}</div></div>
      </div>
    </div>
  </SlideShell>;
}

function SlideSale() {
  return <SlideShell className="bg-ink px-[22px] py-[26px] md:grid-cols-[1.1fr_.9fr] md:gap-[30px] md:px-11 md:py-10">
    <div>
      <h1 className="mb-[18px] text-[27px] leading-[1.08] font-semibold text-white md:text-[44px]">Save up to ₦60,000<br />this week.</h1>
      <p className="mb-[26px] max-w-[440px] text-[14.5px] leading-[1.55] text-white/70 md:text-base">Selected UK-used phones and laptops, discounted for a limited time — same grading, same verification, lower price.</p>
      <div className="mb-7 flex flex-col gap-3 md:flex-row">
        <Button nativeButton={false} render={<Link href="/" />} className="h-11 rounded-lg bg-blue px-5 text-sm font-semibold text-white hover:bg-blue-dark">Shop the offers</Button>
        <Button nativeButton={false} render={<Link href="/" />} variant="outline" className="h-11 rounded-lg border-white/60 bg-transparent px-5 text-sm font-semibold text-white hover:bg-white/8 hover:text-white">See all deals</Button>
      </div>
      <div className="flex flex-wrap gap-[26px] text-[12.5px] text-white/70"><span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> Offers end Sunday</span><span className="inline-flex items-center gap-1.5"><Check className="size-3.5" /> Still fully verified</span></div>
    </div>
    <div className="text-left md:text-right">
      <div className="mb-0.5 text-[13px] text-white/55">Save up to</div>
      <div className="font-heading text-[46px] leading-none font-bold tracking-tight text-blue md:text-[64px]">₦60k</div>
      <div className="mb-[22px] text-[13px] text-white/55">on selected UK-used devices</div>
      <div className="border border-white/14 bg-white/6 px-4 py-3 text-left"><div className="mb-1 text-[11px] tracking-wide text-white/50 uppercase">iPhone 13 Pro 256GB</div><div className="text-sm font-semibold text-white"><span className="mr-1.5 font-normal text-white/40 line-through">{formatNaira(68_000_000)}</span>{formatNaira(62_000_000)}</div></div>
    </div>
  </SlideShell>;
}

function SlideUsed() {
  return <SlideShell className="md:grid-cols-[1.05fr_.95fr]">
    <div>
      <h1 className="mb-[18px] text-[27px] leading-[1.08] font-semibold md:text-[44px]">UK-used doesn&apos;t<br />mean unknown.</h1>
      <p className="mb-[26px] max-w-[440px] text-[14.5px] leading-[1.55] text-ink-70 md:text-base">Every used device gets a condition grade and a battery health check before it&apos;s listed — no surprises when you pick it up or unbox it.</p>
      <HeroCtas primary={{ href: "/", label: "Shop UK-used" }} secondary={{ href: "/", label: "How we grade devices" }} />
      <div className="flex flex-wrap items-center gap-[26px] text-[12.5px] text-ink-70"><span className="inline-flex items-center gap-1.5"><Search className="size-3.5" /> Graded on 12 checkpoints</span><span className="inline-flex items-center gap-1.5"><Battery className="size-3.5" /> Battery health always listed</span><span className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-45 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">Coming soon: IMEI checker</span></div>
    </div>
    <div className="order-first rounded-xl border border-line bg-panel md:order-none">
      <div className="flex items-center justify-between border-b border-line px-[18px] py-3.5 text-[12.5px] font-semibold">Inspection report <span className="text-[11.5px] font-normal text-ink-45">iPhone 13 Pro · UK Used</span></div>
      {([["Screen", "Grade A"], ["Body & frame", "Grade B+"], ["Battery health", "88%"], ["IMEI", "Verified"]] as const).map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-dashed border-line px-[18px] py-3 text-[13px] last:border-b-0"><span>{label}</span><span className="inline-flex items-center gap-1 font-bold text-blue"><Check className="size-3" /> {value}</span></div>)}
    </div>
  </SlideShell>;
}

function ShelfCard({ name, priceKobo, tag }: { name: string; priceKobo: number; tag: "new" | "used" }) {
  return <div className="rounded-xl border border-line bg-panel p-3.5"><div className="relative mb-2.5 flex aspect-square items-center justify-center rounded-lg bg-photo"><ConditionTag variant={tag} size="sm" className="absolute top-2 left-0" /><Search className="w-[42%] text-[#B7BCB5]" /></div><div className="mb-0.5 text-[12.5px] font-semibold">{name}</div><div className="text-[13px] font-bold text-ink-70">{formatNaira(priceKobo)}</div></div>;
}

function HeroCtas({ primary, secondary }: { primary: { href: string; label: string }; secondary: { href: string; label: string } }) {
  return <div className="mb-7 flex flex-col gap-3 md:flex-row">
    <Button nativeButton={false} render={<Link href={primary.href} />} className="h-11 rounded-lg px-5 text-sm font-semibold">{primary.label}</Button>
    <Button nativeButton={false} render={<Link href={secondary.href} />} variant="outline" className="h-11 rounded-lg px-5 text-sm font-semibold">{secondary.label}</Button>
  </div>;
}

function TrustStrip({ items }: { items: { icon: typeof Check; text: string }[] }) {
  return <div className="flex flex-wrap gap-[26px] text-[12.5px] text-ink-70">{items.map((item) => <span key={item.text} className="inline-flex items-center gap-1.5"><item.icon className="size-3.5" /> {item.text}</span>)}</div>;
}
