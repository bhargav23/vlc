import { Plus, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { add, items } = useCart();
  const inCart = items.find((i) => i.product.id === product.id);
  const onSale = !!product.promo;
  const locked = product.is_exclusive && !product.promo;

  const onAdd = () => {
    if (locked) return;
    add(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className={`group relative rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-all ${locked ? "opacity-70" : "hover:shadow-[var(--shadow-pop)] hover:-translate-y-0.5"}`}>
      {onSale ? (
        <span className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-tomato text-white px-2 py-1 rounded-full">
          {product.promo!.discount_label}
        </span>
      ) : product.tag ? (
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-accent text-accent-foreground px-2 py-1 rounded-full">
          {product.tag}
        </span>
      ) : null}
      {product.is_exclusive && (
        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary px-2 py-1 rounded-full">
          Exclusive
        </span>
      )}
      <div className="aspect-square rounded-xl bg-secondary/60 overflow-hidden grid place-items-center text-6xl mb-3 group-hover:scale-[1.03] transition-transform">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span role="img" aria-label={product.name}>{product.emoji}</span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-tight truncate">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{product.unit}</p>
        </div>
        <div className="text-right whitespace-nowrap">
          {onSale ? (
            <>
              <span className="block text-[11px] text-muted-foreground line-through leading-none">Rs {product.original_price}</span>
              <span className="font-bold text-sm text-tomato">Rs {product.price}</span>
            </>
          ) : (
            <span className="font-bold text-sm">Rs {product.price}</span>
          )}
        </div>
      </div>
      {locked ? (
        <Button size="sm" disabled className="mt-3 w-full rounded-full gap-1">
          <Lock className="h-4 w-4" /> Available for {product.promo ? product.promo.promotion_name : "festival"}
        </Button>
      ) : (
        <Button size="sm" onClick={onAdd} aria-label={inCart ? `${product.name}, ${inCart.qty} in cart` : `Add ${product.name} to cart`} className="mt-3 w-full rounded-full gap-1">
          {inCart ? (
            <>
              <Check className="h-4 w-4" /> In cart ({inCart.qty})
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add
            </>
          )}
        </Button>
      )}
    </div>
  );
}
