import { formatNaira } from "@/lib/format";
import type { TickerItem } from "@/types/catalogue";

function TickerEntry({ item }: { item: TickerItem }) {
  if (item.kind === "soon") {
    return (
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-white/14 px-7 text-[12.5px] font-medium">
        <span className="inline-flex items-center rounded-full border border-white/35 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/85 uppercase">
          Coming soon
        </span>
        {item.text}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-white/14 px-7 text-[12.5px] font-medium">
      <span
        className={`relative px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${item.kind === "new" ? "bg-blue" : "bg-blue-dark"}`}
        style={{
          clipPath: "polygon(6px 0, 100% 0, 100% 100%, 6px 100%, 0 50%)",
        }}
      >
        {item.kind === "new" ? "New arrival" : "Offer"}
      </span>
      {item.text}
      {item.priceKobo != null ? (
        <span className="opacity-60">
          {item.wasKobo != null ? (
            <span className="mr-0.5 line-through opacity-45">
              {formatNaira(item.wasKobo)}
            </span>
          ) : null}
          {formatNaira(item.priceKobo)}
        </span>
      ) : null}
    </div>
  );
}

export function TickerBar({ items }: { items: TickerItem[] }) {
  const loop = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-b border-white/8 bg-ink text-white"
      aria-label="New arrivals and current offers"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-9 bg-linear-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-9 bg-linear-to-l from-ink to-transparent" />
      <div
        className="ticker-track flex w-max flex-nowrap items-center py-2.5"
        style={{ animation: "ticker-scroll 28s linear infinite" }}
      >
        {loop.map((item, index) => (
          <TickerEntry key={`${item.text}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}
