import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ActivePromotion, Category, Product, ProductPromo } from "./products";

export type Tier = {
  id: string;
  name: string;
  price_paid: number;
  credit_value: number;
  free_delivery: boolean;
  active: boolean;
  sort_order: number;
};

function computeSale(base: number, type: string, value: number): number {
  if (type === "percent") {
    const pct = Math.max(0, Math.min(100, value));
    return Math.max(0, Math.round((base * (100 - pct)) / 100));
  }
  return Math.max(0, Math.min(base, Math.round(value)));
}

function discountLabel(base: number, sale: number, type: string, value: number): string {
  if (type === "percent" && value > 0) return `−${Math.round(value)}%`;
  if (base > 0 && sale < base) return `−${Math.round(((base - sale) / base) * 100)}%`;
  return "FESTIVAL";
}

export async function fetchCatalog(): Promise<Category[]> {
  const nowIso = new Date().toISOString();
  const [{ data: cats, error: e1 }, { data: groups, error: e2 }, { data: prods, error: e3 }, { data: promos, error: e4 }, { data: items, error: e5 }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("product_groups").select("*").order("sort_order"),
    supabase.from("products").select("*").eq("active", true).order("name"),
    supabase.from("promotions").select("*").eq("active", true).lte("starts_at", nowIso).gte("ends_at", nowIso),
    supabase.from("promotion_items").select("*"),
  ]);
  if (e1 || e2 || e3 || e4 || e5) throw e1 || e2 || e3 || e4 || e5;

  const activePromoMap = new Map((promos ?? []).map((p) => [p.id, p]));
  const promoByProduct = new Map<string, ProductPromo>();
  for (const it of items ?? []) {
    const promo = activePromoMap.get(it.promotion_id);
    if (!promo) continue;
    const product = (prods ?? []).find((p) => p.id === it.product_id);
    if (!product) continue;
    const base = Number(product.price);
    const sale = computeSale(base, it.discount_type, Number(it.discount_value));
    promoByProduct.set(it.product_id, {
      promotion_id: promo.id,
      promotion_name: promo.name,
      promotion_slug: promo.slug,
      banner_text: promo.banner_text,
      accent_color: promo.accent_color,
      ends_at: promo.ends_at,
      sale_price: sale,
      discount_label: discountLabel(base, sale, it.discount_type, Number(it.discount_value)),
    });
  }

  return (cats ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description ?? "",
    groups: (groups ?? [])
      .filter((g) => g.category_id === c.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        products: (prods ?? [])
          .filter((p) => p.group_id === g.id)
          .map<Product>((p) => {
            const base = Number(p.price);
            const promo = promoByProduct.get(p.id) ?? null;
            return {
              id: p.id,
              name: p.name,
              original_price: base,
              price: promo ? promo.sale_price : base,
              unit: p.unit,
              emoji: p.emoji,
              tag: p.tag,
              image_url: (p as { image_url?: string | null }).image_url ?? null,
              is_exclusive: (p as { is_exclusive?: boolean }).is_exclusive ?? false,
              promo,
            };
          }),
      })),
  }));
}

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, staleTime: 60_000 });
}

export async function fetchActivePromotions(): Promise<ActivePromotion[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("starts_at");
  if (error) throw error;
  return (data ?? []) as ActivePromotion[];
}

export function useActivePromotions() {
  return useQuery({ queryKey: ["promotions", "active"], queryFn: fetchActivePromotions, staleTime: 60_000 });
}

export async function fetchTiers(): Promise<Tier[]> {
  const { data, error } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((t) => ({
    ...t,
    price_paid: Number(t.price_paid),
    credit_value: Number(t.credit_value),
  }));
}

export function useTiers() {
  return useQuery({ queryKey: ["tiers"], queryFn: fetchTiers, staleTime: 60_000 });
}
