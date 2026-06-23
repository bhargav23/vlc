
-- 1. promotions table
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  banner_text text,
  description text,
  accent_color text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_window_chk CHECK (ends_at > starts_at)
);

GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promotions are public" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Admins manage promotions" ON public.promotions
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. promotion_items
CREATE TABLE public.promotion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed_price')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, product_id)
);

CREATE INDEX promotion_items_product_idx ON public.promotion_items(product_id);

GRANT SELECT ON public.promotion_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotion_items TO authenticated;
GRANT ALL ON public.promotion_items TO service_role;

ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promotion items are public" ON public.promotion_items FOR SELECT USING (true);
CREATE POLICY "Admins manage promotion items" ON public.promotion_items
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. is_exclusive on products
ALTER TABLE public.products ADD COLUMN is_exclusive boolean NOT NULL DEFAULT false;

-- 4. updated_at trigger for promotions
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER promotions_touch_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
