import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTiers } from "@/lib/catalog";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

function tierWhatsAppUrl(name: string, pay: number, value: number) {
  const text = `Hi Velocity Kitchen, I'd like to purchase the "${name}" subscription — pay Rs ${pay} for Rs ${value} of credit. Please share payment details.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Prepaid Subscriptions — Velocity Kitchen" },
      { name: "description", content: "Top up and save: pay less, get more. Free delivery on higher tiers." },
      { property: "og:title", content: "Prepaid Subscriptions — Velocity Kitchen" },
      { property: "og:description", content: "Top up your wallet, get bonus value and free delivery on higher tiers." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/subscriptions" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/subscriptions" }],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { data: tiers = [] } = useTiers();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
      <header className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Prepaid Subscription Offers
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">Save on fresh-cut vegetable delivery</h1>
        <p className="mt-3 text-muted-foreground">
          Top up your Velocity Kitchen wallet and get extra value on every order.
        </p>
      </header>

      <h2 className="sr-only">Subscription tiers</h2>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {tiers.map((t, idx) => {
          const savings = t.credit_value - t.price_paid;
          const highlighted = idx === 1;
          return (
            <div key={t.id} className={`relative rounded-3xl border p-6 sm:p-7 bg-card transition-all hover:-translate-y-1 ${highlighted ? "border-primary shadow-[var(--shadow-pop)] ring-2 ring-primary/20" : "border-border shadow-[var(--shadow-soft)]"}`}>
              {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              )}
              <h3 className="text-lg font-bold">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold">Rs {t.price_paid}</span>
                <span className="text-muted-foreground text-sm">one-time</span>
              </div>
              <p className="mt-1 text-sm">
                Get <span className="font-semibold text-primary">Rs {t.credit_value}</span> worth of products
                <span className="ml-1 inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Save Rs {savings}</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Rs {savings} bonus value</li>
                {t.free_delivery && <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Free delivery included</li>}
                <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Use across the entire menu</li>
              </ul>
              <Button asChild className="mt-6 w-full rounded-full" variant={highlighted ? "default" : "outline"}>
                <a href={tierWhatsAppUrl(t.name, t.price_paid, t.credit_value)} target="_blank" rel="noopener noreferrer">Choose {t.name}</a>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-secondary/40 p-6 sm:p-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-full bg-primary/15 text-primary grid place-items-center"><Truck className="h-5 w-5" /></span>
          <div>
            <p className="font-bold">Always free delivery above Rs 200/-</p>
            <p className="text-sm text-muted-foreground">Delivered twice daily: 6–8 AM & 5–8 PM</p>
          </div>
        </div>
        <Button asChild className="rounded-full"><Link to="/shop">Start shopping</Link></Button>
      </div>
    </div>
  );
}
