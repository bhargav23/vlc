-- Seed subscription tiers for Velocity Kitchen.
-- These tiers power the /subscriptions page and prepaid wallet offers.

INSERT INTO public.subscription_tiers (name, price_paid, credit_value, free_delivery, active, sort_order)
SELECT v.name, v.price_paid, v.credit_value, v.free_delivery, true, v.sort_order
FROM (VALUES
  ('Starter', 499.00, 550.00, false, 0),
  ('Value', 999.00, 1150.00, true, 1),
  ('Premium', 1999.00, 2400.00, true, 2)
) AS v(name, price_paid, credit_value, free_delivery, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_tiers t WHERE t.name = v.name
);
