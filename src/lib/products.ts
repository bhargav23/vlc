// Shared product/catalog types. Data now lives in the database.

export type ProductPromo = {
  promotion_id: string;
  promotion_name: string;
  promotion_slug: string;
  banner_text: string | null;
  accent_color: string | null;
  ends_at: string;
  sale_price: number;
  discount_label: string; // e.g. "−25%" or "FESTIVAL"
};

export type Product = {
  id: string;
  name: string;
  price: number; // effective price (sale_price if promo, else base price)
  original_price: number; // catalog base price
  unit: string;
  emoji: string;
  tag?: string | null;
  image_url?: string | null;
  is_exclusive: boolean;
  promo?: ProductPromo | null;
};

export type ProductGroup = {
  id: string;
  name: string;
  products: Product[];
};

export type Category = {
  id: string;
  slug: string;
  title: string;
  description: string;
  groups: ProductGroup[];
};

export type ActivePromotion = {
  id: string;
  name: string;
  slug: string;
  banner_text: string | null;
  description: string | null;
  accent_color: string | null;
  starts_at: string;
  ends_at: string;
};
