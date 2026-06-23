import type { Category } from "@/lib/products";
import { ProductCard } from "./ProductCard";

export function CategorySection({ category }: { category: Category }) {
  return (
    <section id={category.id} className="scroll-mt-24">
      <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">{category.title}</h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">{category.description}</p>
        </div>
      </div>
      <div className="space-y-8">
        {category.groups.map((g) => (
          <div key={g.name}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">{g.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {g.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
