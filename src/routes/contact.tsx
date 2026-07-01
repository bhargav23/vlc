import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_TEL, BRAND_EMAIL } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Velocity Kitchen" },
      { name: "description", content: "Reach out by phone, email, or Google Maps for fresh delivery support." },
      { property: "og:title", content: "Contact Velocity Kitchen" },
      { property: "og:description", content: "Get in touch for orders, delivery help, or kitchen support." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/contact" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
      <div className="grid gap-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Contact us</p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Need help? We’re only a call, email or map tap away.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Reach Velocity Kitchen directly for order support, delivery questions, or to check if we deliver to your neighbourhood.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <a
            href="https://maps.app.goo.gl/4Kk7CKQktsA7uMvH7"
            target="_blank"
            rel="noreferrer"
            className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-semibold">Find us on Google Maps</p>
            <p className="mt-2 text-sm text-muted-foreground">Open the kitchen location and delivery area in Maps.</p>
          </a>

          <a
            href={`tel:${BRAND_PHONE_TEL}`}
            className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-semibold">Call us</p>
            <p className="mt-2 text-sm text-muted-foreground">{BRAND_PHONE_DISPLAY}</p>
          </a>

          <a
            href={`mailto:${BRAND_EMAIL}`}
            className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-semibold">Email support</p>
            <p className="mt-2 text-sm text-muted-foreground">{BRAND_EMAIL}</p>
          </a>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Ready to order?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Visit the menu to build your basket and choose a delivery slot for today or tomorrow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/shop">View menu</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/checkout">Go to checkout</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
