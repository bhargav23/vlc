import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useCatalog } from "@/lib/catalog";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/site/ProductCard";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { FestivalSpecials } from "@/components/site/FestivalSpecials";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Buy Fresh Cut Vegetables Online | Velocity Kitchen" },
      { name: "description", content: "Buy fresh-cut and chopped vegetables online, plus ready-to-cook kits, salads, juices and pantry essentials for twice-daily delivery." },
      { property: "og:title", content: "Buy Fresh Cut Vegetables Online | Velocity Kitchen" },
      { property: "og:description", content: "Shop fresh-cut vegetables, ready-to-cook kits, salads, juices and pantry essentials." },
      { name: "twitter:title", content: "Buy Fresh Cut Vegetables Online | Velocity Kitchen" },
      { name: "twitter:description", content: "Shop fresh-cut vegetables, ready-to-cook kits, salads, juices and pantry essentials." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/shop" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/shop" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Fresh-cut vegetables and ready-to-cook food",
          description: "Buy chopped vegetables, meal kits, salads, juices and pantry essentials online for twice-daily delivery.",
          url: "https://velocitykitchen.lovable.app/shop",
        }),
      },
    ],
  }),
  component: Shop,
});

const itemTypes = [
  { id: "kits", label: "Kits", catSlug: "kits", groupNames: ["Mixed Veg & Curry Kits", "Chutney Kits"] },
  { id: "fresh-cuts", label: "Fresh Cuts", catSlug: "fresh-cuts", groupNames: ["Cut Veggies", "Cut Leafy Veggies", "Cut Fruits"] },
  { id: "salads", label: "Salads", catSlug: "ready", groupNames: ["Salads"] },
  { id: "drinks", label: "Drinks", catSlug: "ready", groupNames: ["Health Drinks"] },
  { id: "pantry", label: "Pantry", catSlug: "pantry", groupNames: ["Grated Items", "Masala Items", "Powders"] },
];

function Shop() {
  const { data: categories = [], isLoading } = useCatalog();
  const [query, setQuery] = useState("");
  const [typeId, setTypeId] = useState("all");

  type Row = { product: Product; catSlug: string; catTitle: string; groupName: string };
  const allRows: Row[] = useMemo(
    () =>
      categories.flatMap((c) =>
        c.groups.flatMap((g) =>
          g.products.map<Row>((p) => ({ product: p, catSlug: c.slug, catTitle: c.title, groupName: g.name })),
        ),
      ),
    [categories],
  );

  const { PRICE_MIN, PRICE_MAX } = useMemo(() => {
    const prices = allRows.map((r) => r.product.price);
    return {
      PRICE_MIN: prices.length ? Math.min(...prices) : 0,
      PRICE_MAX: prices.length ? Math.max(...prices) : 100,
    };
  }, [allRows]);

  const [price, setPrice] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (allRows.length === 0) return;
    setPrice((current) => current ?? [PRICE_MIN, PRICE_MAX]);
  }, [allRows.length, PRICE_MIN, PRICE_MAX]);

  const effective: [number, number] = price ?? [PRICE_MIN, PRICE_MAX];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      if (typeId !== "all") {
        const t = itemTypes.find((it) => it.id === typeId);
        if (!t || r.catSlug !== t.catSlug || !t.groupNames.includes(r.groupName)) return false;
      }
      if (r.product.price < effective[0] || r.product.price > effective[1]) return false;
      if (q && !r.product.name.toLowerCase().includes(q) && !r.groupName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allRows, query, typeId, effective]);

  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; groups: Map<string, Product[]> }>();
    for (const r of filtered) {
      if (!map.has(r.catSlug)) map.set(r.catSlug, { title: r.catTitle, groups: new Map() });
      const cat = map.get(r.catSlug)!;
      if (!cat.groups.has(r.groupName)) cat.groups.set(r.groupName, []);
      cat.groups.get(r.groupName)!.push(r.product);
    }
    return map;
  }, [filtered]);

  const reset = () => {
    setQuery(""); setTypeId("all"); setPrice([PRICE_MIN, PRICE_MAX]);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold">The Menu</h1>
        <p className="mt-2 text-muted-foreground">Hand-cut every morning. Pick from kits, fresh cuts, salads, juices and pantry.</p>
      </header>

      <FestivalSpecials />

      <div className="sticky top-16 z-30 -mx-4 px-4 mt-6 bg-background/90 backdrop-blur border-b border-border pb-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="shop-search" aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fresh cuts, juices, kits…" className="pl-9 pr-9 h-11 rounded-full" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <Chip active={typeId === "all"} onClick={() => setTypeId("all")}>All</Chip>
          {itemTypes.map((t) => (
            <Chip key={t.id} active={typeId === t.id} onClick={() => setTypeId(t.id)}>{t.label}</Chip>
          ))}
        </div>

        {allRows.length > 0 && PRICE_MAX > PRICE_MIN && (
          <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Price: Rs {effective[0]} – Rs {effective[1]}
              </p>
              <Slider aria-label="Price range" value={effective} min={PRICE_MIN} max={PRICE_MAX} step={5} onValueChange={(v) => setPrice([v[0], v[1]] as [number, number])} className="py-2" />
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={reset}>Clear filters</Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading menu…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <p className="font-semibold">No products match your filters</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={reset}>Reset filters</Button>
          </div>
        ) : (
          <div className="space-y-12">
            {Array.from(grouped.entries()).map(([slug, cat]) => (
              <section key={slug} id={slug}>
                <h2 className="text-2xl font-bold mb-4">{cat.title}</h2>
                <div className="space-y-6">
                  {Array.from(cat.groups.entries()).map(([gName, products]) => (
                    <div key={gName}>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">{gName}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {products.map((p) => <ProductCard key={p.id} product={p} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={active ? "default" : "outline"} size="sm" aria-pressed={active} onClick={onClick} className="whitespace-nowrap rounded-full px-4">
      {children}
    </Button>
  );
}
