-- Seed basic catalog data for Velocity Kitchen.
-- Adds initial categories, groups, and products for common grocery sections.

-- Categories
INSERT INTO public.categories (slug, title, description, sort_order)
VALUES
  ('fresh-cuts', 'Fresh Cuts', 'Freshly cut vegetables, leafy greens and fruits for quick cooking.', 0),
  ('kits', 'Kits', 'Ready-to-cook meal kits with prepped vegetables and spices.', 1),
  ('ready', 'Ready to Eat & Drink', 'Fresh salads and cold-pressed juices for on-the-go meals.', 2),
  ('pantry', 'Pantry', 'Essential pantry ingredients, spices and grated items.', 3)
ON CONFLICT (slug) DO NOTHING;

-- Product groups
WITH category_rows AS (
  SELECT slug, id FROM public.categories WHERE slug IN ('fresh-cuts','kits','ready','pantry')
), group_rows AS (
  SELECT * FROM (VALUES
    ('fresh-cuts', 'Cut Veggies', 0),
    ('fresh-cuts', 'Cut Leafy Veggies', 1),
    ('fresh-cuts', 'Cut Fruits', 2),
    ('kits', 'Mixed Veg & Curry Kits', 0),
    ('kits', 'Chutney Kits', 1),
    ('ready', 'Salads', 0),
    ('ready', 'Health Drinks', 1),
    ('pantry', 'Grated Items', 0),
    ('pantry', 'Masala Items', 1),
    ('pantry', 'Powders', 2)
  ) AS v(category_slug, name, sort_order)
)
INSERT INTO public.product_groups (category_id, name, sort_order)
SELECT c.id, g.name, g.sort_order
FROM group_rows g
JOIN category_rows c ON c.slug = g.category_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_groups pg
  WHERE pg.category_id = c.id AND pg.name = g.name
);

-- Products
WITH group_rows AS (
  SELECT name, id FROM public.product_groups
  WHERE name IN (
    'Cut Veggies', 'Cut Leafy Veggies', 'Cut Fruits',
    'Mixed Veg & Curry Kits', 'Chutney Kits',
    'Salads', 'Health Drinks',
    'Grated Items', 'Masala Items', 'Powders'
  )
), product_rows AS (
  SELECT * FROM (VALUES
    ('Cut Veggies', 'Cauliflower florets', 120.00, '500g', '🥦', 'Fresh', true),
    ('Cut Veggies', 'Carrot sticks', 80.00, '500g', '🥕', 'Fresh', true),
    ('Cut Leafy Veggies', 'Baby spinach', 95.00, '250g', '🥬', 'Fresh', true),
    ('Cut Leafy Veggies', 'Mixed salad leaves', 110.00, '200g', '🥗', 'Fresh', true),
    ('Cut Fruits', 'Pineapple chunks', 140.00, '300g', '🍍', 'Fresh', true),
    ('Mixed Veg & Curry Kits', 'Mixed veg curry kit', 220.00, '1 kit', '🍲', 'Kit', true),
    ('Mixed Veg & Curry Kits', 'Paneer butter masala kit', 260.00, '1 kit', '🧀', 'Kit', true),
    ('Chutney Kits', 'Mint chutney pack', 60.00, '100g', '🌿', 'Fresh', true),
    ('Chutney Kits', 'Tamarind chutney pack', 55.00, '100g', '🥭', 'Fresh', true),
    ('Salads', 'Garden salad bowl', 180.00, '1 bowl', '🥗', 'Ready', true),
    ('Salads', 'Quinoa salad bowl', 220.00, '1 bowl', '🥙', 'Ready', true),
    ('Health Drinks', 'Green detox juice', 160.00, '250ml', '🥤', 'Cold-pressed', true),
    ('Health Drinks', 'Beetroot energy juice', 150.00, '250ml', '🧃', 'Cold-pressed', true),
    ('Grated Items', 'Grated coconut', 90.00, '200g', '🥥', 'Pantry', true),
    ('Masala Items', 'Garam masala', 120.00, '50g', '🧂', 'Spice', true),
    ('Powders', 'Turmeric powder', 95.00, '50g', '🌟', 'Spice', true)
  ) AS v(group_name, name, price, unit, emoji, tag, active)
)
INSERT INTO public.products (group_id, name, price, unit, emoji, tag, active)
SELECT g.id, p.name, p.price, p.unit, p.emoji, p.tag, p.active
FROM product_rows p
JOIN group_rows g ON g.name = p.group_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.products pr
  WHERE pr.group_id = g.id AND pr.name = p.name
);
