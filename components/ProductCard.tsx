import Link from "next/link";
import { Smartphone } from "lucide-react";
import { ConditionTag } from "@/components/ConditionTag";
import { PriceDisplay } from "@/components/PriceDisplay";
import { StockDot } from "@/components/StockDot";
import type { ProductCardModel } from "@/types/catalogue";

function tagVariant(product: ProductCardModel) {
  if (product.condition === "out" || product.stock === "out") return "out" as const;
  if (product.condition === "uk_used") return "used" as const;
  return "new" as const;
}

export function ProductCard({ product }: { product: ProductCardModel }) {
  return (
    <Link href={`/products/${product.slug}`} className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="relative flex aspect-square items-center justify-center rounded-lg bg-photo">
        <ConditionTag
          variant={tagVariant(product)}
          size="sm"
          className="absolute top-2.5 left-0"
        />
        <Smartphone className="w-[38%] text-[#B7BCB5]" />
      </div>
      <div className="px-3.5 pt-3.5 pb-4">
        <div className="mb-1 text-[13.5px] font-medium">{product.name}</div>
        <PriceDisplay kobo={product.priceKobo} className="mb-2" />
        <StockDot level={product.stock} label={product.stockLabel} />
      </div>
    </Link>
  );
}
