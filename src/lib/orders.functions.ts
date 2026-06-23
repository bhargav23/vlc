import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeAudit } from "./audit.server";
import { enforceRateLimit } from "./rate-limit.server";

import { getRequestHeader } from "@tanstack/react-start/server";

const FREE_DELIVERY_THRESHOLD = 200;
const DELIVERY_FEE = 30;
const DELIVERY_TIME_ZONE = "Asia/Kolkata";
const MAX_DELIVERY_DAYS_AHEAD = 7;

function dateOnlyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));

  if (!year || !month || !day) {
    throw new Error("Could not validate delivery date.");
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function validateDeliveryDate(value: string) {
  const selected = parseDateOnly(value);
  if (!selected) {
    throw new Error("Invalid delivery date.");
  }

  const today = dateOnlyInTimeZone(new Date(), DELIVERY_TIME_ZONE);
  const maxDate = new Date(today);
  maxDate.setUTCDate(today.getUTCDate() + MAX_DELIVERY_DAYS_AHEAD);

  if (selected < today || selected > maxDate) {
    throw new Error("Delivery date must be within the next 7 days.");
  }
}

const PlaceOrderInput = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  address: z.string().trim().min(8).max(300),
  city: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  slot: z.enum(["morning", "evening"]),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid delivery date"),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => PlaceOrderInput.parse(input))
  .handler(async ({ data }) => {
    validateDeliveryDate(data.deliveryDate);

    await Promise.all([
      enforceRateLimit({
        scope: "place-order:request",
        maxRequests: 8,
        windowSeconds: 15 * 60,
      }),
      enforceRateLimit({
        scope: "place-order:phone",
        identifier: data.phone,
        maxRequests: 3,
        windowSeconds: 60 * 60,
      }),
    ]);

    // Resolve user_id from the bearer token if present (orders are optionally linked to a user).
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    // Fetch authoritative prices from the database.
    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)));
    const nowIso = new Date().toISOString();
    const [productsRes, promosRes, itemsRes] = await Promise.all([
      supabaseAdmin.from("products").select("id, name, price, active, is_exclusive").in("id", productIds),
      supabaseAdmin
        .from("promotions")
        .select("id, name")
        .eq("active", true)
        .lte("starts_at", nowIso)
        .gte("ends_at", nowIso),
      supabaseAdmin.from("promotion_items").select("promotion_id, product_id, discount_type, discount_value").in("product_id", productIds),
    ]);
    if (productsRes.error) {
      console.error("[placeOrder] products fetch:", productsRes.error);
      throw new Error("Could not retrieve product information.");
    }
    if (promosRes.error || itemsRes.error) {
      console.error("[placeOrder] promo fetch:", promosRes.error || itemsRes.error);
      throw new Error("Could not retrieve promotion information.");
    }

    const activePromoIds = new Set((promosRes.data ?? []).map((p) => p.id));
    const promoByProduct = new Map<string, { type: string; value: number }>();
    for (const it of itemsRes.data ?? []) {
      if (!activePromoIds.has(it.promotion_id)) continue;
      promoByProduct.set(it.product_id, { type: it.discount_type, value: Number(it.discount_value) });
    }

    const productMap = new Map(
      (productsRes.data ?? [])
        .filter((p) => p.active)
        .map((p) => [p.id, { name: p.name, price: Number(p.price), is_exclusive: !!p.is_exclusive }]),
    );
    if (productMap.size !== productIds.length) {
      throw new Error("One or more items are unavailable");
    }

    let subtotal = 0;
    const itemRows = data.items.map((i) => {
      const p = productMap.get(i.product_id)!;
      const promo = promoByProduct.get(i.product_id);
      if (p.is_exclusive && !promo) {
        throw new Error(`"${p.name}" is only available during a festival promotion.`);
      }
      let effective = p.price;
      if (promo) {
        if (promo.type === "percent") {
          const pct = Math.max(0, Math.min(100, promo.value));
          effective = Math.max(0, Math.round((p.price * (100 - pct)) / 100));
        } else {
          effective = Math.max(0, Math.min(p.price, Math.round(promo.value)));
        }
      }
      subtotal += effective * i.qty;
      return {
        product_id: i.product_id,
        qty: i.qty,
        price_snapshot: effective,
        name_snapshot: p.name,
      };
    });
    const delivery_fee =
      subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = subtotal + delivery_fee;

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.fullName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        pincode: data.pincode,
        landmark: data.landmark || null,
        slot: data.slot,
        delivery_date: data.deliveryDate,
        subtotal,
        delivery_fee,
        total,
      })
      .select("id")
      .single();
    if (orderErr || !orderRow) {
      console.error("[placeOrder] order insert:", orderErr);
      throw new Error("Could not place your order. Please try again.");
    }

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemRows.map((r) => ({ ...r, order_id: orderRow.id })));
    if (itemsErr) {
      console.error("[placeOrder] order_items insert:", itemsErr);
      // Roll back the order if items failed.
      await supabaseAdmin.from("orders").delete().eq("id", orderRow.id);
      throw new Error("Could not place your order. Please try again.");
    }

    await writeAudit("order.placed", {
      user_id: userId,
      metadata: {
        order_id: orderRow.id,
        item_count: itemRows.length,
        subtotal,
        delivery_fee,
        total,
        slot: data.slot,
        city: data.city,
        pincode: data.pincode,
      },
    });

    return { id: orderRow.id, subtotal, delivery_fee, total };
  });
