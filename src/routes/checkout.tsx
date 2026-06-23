import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { Minus, Plus, Trash2, ShoppingBag, Sunrise, Sunset, CheckCircle2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCart, computeTotals, FREE_DELIVERY_THRESHOLD } from "@/lib/cart";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";
import { logWhatsAppOrderIntent } from "@/lib/audit.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Velocity Kitchen" },
      { name: "description", content: "Confirm your delivery address, pick a slot and place your fresh order." },
      { property: "og:title", content: "Checkout — Velocity Kitchen" },
      { property: "og:description", content: "Morning 6–8 AM or evening 5–8 PM. Free delivery above Rs 200." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/checkout" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/checkout" }],
  }),
  component: CheckoutPage,
});

const slots = [
  { id: "morning", label: "Morning", time: "6:00 AM – 8:00 AM", icon: Sunrise },
  { id: "evening", label: "Evening", time: "5:00 PM – 8:00 PM", icon: Sunset },
] as const;

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
const MIN_DATE = todayStart();
const MAX_DATE = addDays(MIN_DATE, 7);

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  address: z.string().trim().min(8, "Please provide a complete address").max(300),
  city: z.string().trim().min(2, "Enter your city").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  slot: z.enum(["morning", "evening"], { message: "Pick a delivery slot" }),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a delivery date"),
});

type FormState = z.input<typeof schema>;
type FormErrors = Partial<Record<keyof FormState, string>>;

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { delivery, total } = useMemo(() => computeTotals(subtotal), [subtotal]);
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    landmark: "",
    slot: "morning",
    deliveryDate: format(addDays(MIN_DATE, 1), "yyyy-MM-dd"),
  });
  const [dateOpen, setDateOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [placed, setPlaced] = useState<null | { id: string; slot: string; total: number }>(null);
  const submitOrder = useServerFn(placeOrder);
  const logWa = useServerFn(logWhatsAppOrderIntent);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitOrder({
        data: {
          items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          address: parsed.data.address,
          city: parsed.data.city,
          pincode: parsed.data.pincode,
          landmark: parsed.data.landmark || "",
          slot: parsed.data.slot,
          deliveryDate: parsed.data.deliveryDate,
        },
      });

      const slotLabel = slots.find((s) => s.id === parsed.data.slot)!;
      setPlaced({
        id: `VK-${result.id.slice(0, 8).toUpperCase()}`,
        slot: `${format(new Date(parsed.data.deliveryDate), "EEE, MMM d")} · ${slotLabel.label} (${slotLabel.time})`,
        total: result.total,
      });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not place order";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 grid place-items-center text-primary mb-5">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold">Order placed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thanks {form.fullName.split(" ")[0]}. We'll deliver your freshness in the <strong>{placed.slot}</strong> slot.
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left">
          <Row label="Order ID" value={placed.id} />
          <Row label="Total paid" value={`Rs ${placed.total}`} />
          <Row label="Delivering to" value={`${form.address}, ${form.city} - ${form.pincode}`} />
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild className="rounded-full">
            <Link to="/shop">Continue shopping</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full" onClick={() => setPlaced(null)}>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Checkout</h1>
        <p className="mt-2 text-muted-foreground">Confirm your basket, address and preferred delivery slot.</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-3">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-semibold">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mt-1">Add some fresh picks to get started.</p>
          <Button asChild className="mt-5 rounded-full" onClick={() => navigate({ to: "/shop" })}>
            <Link to="/shop">Browse the menu</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: address + slot */}
          <div className="space-y-8">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-4">Delivery address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name" htmlFor="checkout-fullName" error={errors.fullName}>
                  <Input id="checkout-fullName" autoComplete="name" value={form.fullName} maxLength={80} onChange={(e) => update("fullName", e.target.value)} placeholder="Aarav Sharma" />
                </Field>
                <Field label="Mobile number" htmlFor="checkout-phone" error={errors.phone}>
                  <Input
                    id="checkout-phone"
                    autoComplete="tel-national"
                    value={form.phone}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                  />
                </Field>
                <Field label="Address" htmlFor="checkout-address" error={errors.address} className="sm:col-span-2">
                  <Textarea
                    id="checkout-address"
                    autoComplete="street-address"
                    value={form.address}
                    maxLength={300}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Flat / House no., Building, Street"
                    rows={3}
                  />
                </Field>
                <Field label="City" htmlFor="checkout-city" error={errors.city}>
                  <Input id="checkout-city" autoComplete="address-level2" value={form.city} maxLength={60} onChange={(e) => update("city", e.target.value)} placeholder="Hyderabad" />
                </Field>
                <Field label="Pincode" htmlFor="checkout-pincode" error={errors.pincode}>
                  <Input
                    id="checkout-pincode"
                    autoComplete="postal-code"
                    value={form.pincode}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
                    placeholder="500032"
                  />
                </Field>
                <Field label="Landmark (optional)" htmlFor="checkout-landmark" error={errors.landmark} className="sm:col-span-2">
                  <Input id="checkout-landmark" value={form.landmark ?? ""} maxLength={120} onChange={(e) => update("landmark", e.target.value)} placeholder="Near the park" />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold">Pick a delivery date & slot</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose a day within the next week and your preferred time.</p>

              <div className="mt-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery date</Label>
                <div className="mt-1.5">
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[280px] justify-start text-left font-normal",
                          !form.deliveryDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.deliveryDate
                          ? format(new Date(form.deliveryDate), "EEEE, MMM d")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.deliveryDate ? new Date(form.deliveryDate) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            update("deliveryDate", format(d, "yyyy-MM-dd"));
                            setDateOpen(false);
                          }
                        }}
                        disabled={(d) => d < MIN_DATE || d > MAX_DATE}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {errors.deliveryDate && <p className="mt-1 text-xs text-destructive">{errors.deliveryDate}</p>}
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {slots.map((s) => {
                  const Icon = s.icon;
                  const active = form.slot === s.id;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => update("slot", s.id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:bg-secondary"
                      }`}
                    >
                      <span className={`h-10 w-10 rounded-full grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.time}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.slot && <p className="mt-2 text-xs text-destructive">{errors.slot}</p>}
            </section>
          </div>

          {/* Right: summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold mb-4">Order summary</h2>
              <ul className="space-y-3 max-h-72 overflow-auto pr-1">
                {items.map((i) => (
                  <li key={i.product.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-secondary/60 grid place-items-center text-2xl shrink-0">
                      <span aria-hidden>{i.product.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{i.product.name}</p>
                      <p className="text-xs text-muted-foreground">Rs {i.product.price} · {i.product.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${i.product.name}`}
                        onClick={() => setQty(i.product.id, i.qty - 1)}
                        className="h-7 w-7 grid place-items-center rounded-full border border-border hover:bg-secondary"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${i.product.name}`}
                        onClick={() => setQty(i.product.id, i.qty + 1)}
                        className="h-7 w-7 grid place-items-center rounded-full border border-border hover:bg-secondary"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${i.product.name} from cart`}
                        onClick={() => remove(i.product.id)}
                        className="ml-1 h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <Separator className="my-4" />

              <div className="space-y-1.5 text-sm">
                <Row label="Subtotal" value={`Rs ${subtotal}`} />
                <Row
                  label="Delivery"
                  value={delivery === 0 ? <span className="text-primary font-semibold">FREE</span> : `Rs ${delivery}`}
                />
              </div>

              {remainingForFree > 0 && (
                <div className="mt-3 rounded-lg bg-accent/40 text-accent-foreground text-xs px-3 py-2">
                  Add <strong>Rs {remainingForFree}</strong> more to unlock free delivery.
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <span className="text-base font-bold">Total</span>
                <span className="text-xl font-extrabold">Rs {total}</span>
              </div>

              <Button type="submit" size="lg" disabled={submitting} className="mt-5 w-full rounded-full">
                {submitting ? "Placing order…" : "Place order"}
              </Button>
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => {
                  const waSchema = schema.pick({ fullName: true, phone: true, address: true });
                  const parsed = waSchema.safeParse({
                    fullName: form.fullName,
                    phone: form.phone,
                    address: form.address,
                  });
                  if (!parsed.success) {
                    const fieldErrors: FormErrors = {};
                    for (const issue of parsed.error.issues) {
                      const key = issue.path[0] as keyof FormState;
                      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
                    }
                    setErrors((e) => ({ ...e, ...fieldErrors }));
                    toast.error("Please fill name, phone and address before ordering on WhatsApp");
                    return;
                  }
                  const url = buildWhatsAppOrderUrl({
                    items,
                    subtotal,
                    delivery,
                    total,
                    form: {
                      fullName: parsed.data.fullName,
                      phone: parsed.data.phone,
                      address: parsed.data.address,
                      city: form.city,
                      pincode: form.pincode,
                      landmark: form.landmark || undefined,
                      slot: slots.find((s) => s.id === form.slot)?.label,
                    },
                  });
                  void logWa({
                    data: {
                      source: "checkout",
                      item_count: items.length,
                      total,
                      customer_name: parsed.data.fullName,
                      phone: parsed.data.phone,
                    },
                  }).catch(() => {});
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] ${
                  items.length === 0 ? "opacity-50 pointer-events-none" : ""
                }`}
                style={{ backgroundColor: "#25D366" }}
              >
                <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                  <path d="M19.11 17.55c-.27-.14-1.62-.8-1.87-.89-.25-.09-.43-.14-.62.14-.18.27-.71.89-.87 1.07-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.21-1.36-.82-.73-1.37-1.63-1.53-1.9-.16-.27-.02-.42.12-.55.13-.13.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.47-.62-.48l-.53-.01c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3 0 1.36.99 2.67 1.12 2.85.14.18 1.94 2.96 4.71 4.15.66.28 1.18.45 1.58.58.66.21 1.27.18 1.74.11.53-.08 1.62-.66 1.85-1.3.23-.64.23-1.18.16-1.3-.07-.11-.25-.18-.52-.32zM16.02 4.5C9.66 4.5 4.5 9.66 4.5 16.02c0 2.04.54 4.03 1.56 5.79L4.5 27.5l5.86-1.53a11.46 11.46 0 0 0 5.66 1.47h.01c6.36 0 11.52-5.16 11.52-11.52 0-3.08-1.2-5.97-3.38-8.15A11.45 11.45 0 0 0 16.02 4.5zm0 21.1c-1.74 0-3.45-.47-4.94-1.36l-.35-.21-3.48.91.93-3.39-.23-.36a9.55 9.55 0 0 1-1.46-5.07c0-5.27 4.29-9.56 9.56-9.56 2.55 0 4.95.99 6.76 2.8a9.5 9.5 0 0 1 2.8 6.76c0 5.27-4.29 9.56-9.59 9.56z" />
                </svg>
                Order on WhatsApp
              </button>

              <p className="mt-2 text-[11px] text-center text-muted-foreground">
                Cash / UPI on delivery · Free delivery above Rs {FREE_DELIVERY_THRESHOLD}
              </p>
            </section>
          </aside>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
