import { Sparkles } from "lucide-react";
import { useCatalog, useActivePromotions } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/products";

export function FestivalSpecials() {
  const { data: promos = [] } = useActivePromotions();
  const { data: categories = [] } = useCatalog();
  if (promos.length === 0) return null;

  const products: Product[] = [];
  const seen = new Set<string>();
  for (const c of categories) for (const g of c.groups) for (const p of g.products) {
    if (p.promo && !seen.has(p.id)) {
      seen.add(p.id);
      products.push(p);
    }
  }
  if (products.length === 0) return null;

  const headline = promos[0].name;
  return (
    <section className="mx-auto max-w-7xl px-4 mt-10">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-accent/30 via-card to-card p-5 sm:p-8">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-tomato/15 text-tomato px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Festival Specials
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold">{headline}</h2>
            {promos[0].description && (
              <p className="text-muted-foreground text-sm mt-1 max-w-xl">{promos[0].description}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
