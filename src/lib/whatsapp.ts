import type { CartItem } from "./cart";

export const WHATSAPP_NUMBER = "919493223259";
export const BRAND_PHONE_DISPLAY = "+91 94932 23259";
export const BRAND_PHONE_TEL = "+919493223259";
export const BRAND_EMAIL = "velocitykitchen3259@gmail.com";

export type WhatsAppForm = {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  slot?: string;
};

export function buildWhatsAppOrderMessage(opts: {
  items: CartItem[];
  subtotal: number;
  delivery: number;
  total: number;
  form?: WhatsAppForm;
}): string {
  const { items, subtotal, delivery, total, form } = opts;
  const lines: string[] = [];
  lines.push("Hi Velocity Kitchen, I'd like to order:");
  if (items.length === 0) {
    lines.push("(no items yet — I'd like to place an order)");
  } else {
    for (const i of items) {
      lines.push(`• ${i.product.name} x${i.qty} — Rs ${i.qty * i.product.price}`);
    }
    lines.push("");
    lines.push(`Subtotal: Rs ${subtotal}`);
    lines.push(`Delivery: ${delivery === 0 ? "FREE" : `Rs ${delivery}`}`);
    lines.push(`Total: Rs ${total}`);
  }

  if (form) {
    const detail: string[] = [];
    if (form.fullName) detail.push(`Name: ${form.fullName}`);
    if (form.phone) detail.push(`Phone: ${form.phone}`);
    const addrParts = [form.address, form.city, form.pincode].filter(Boolean);
    if (addrParts.length) detail.push(`Address: ${addrParts.join(", ")}`);
    if (form.landmark) detail.push(`Landmark: ${form.landmark}`);
    if (form.slot) detail.push(`Slot: ${form.slot}`);
    if (detail.length) {
      lines.push("");
      lines.push(...detail);
    }
  }

  return lines.join("\n");
}

export function buildWhatsAppOrderUrl(opts: {
  items: CartItem[];
  subtotal: number;
  delivery: number;
  total: number;
  form?: WhatsAppForm;
}): string {
  const text = buildWhatsAppOrderMessage(opts);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
