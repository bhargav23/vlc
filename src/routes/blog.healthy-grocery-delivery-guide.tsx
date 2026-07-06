import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Leaf, ListChecks, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const URL = "https://velocitykitchen.in/blog/healthy-grocery-delivery-guide";

export const Route = createFileRoute("/blog/healthy-grocery-delivery-guide")({
  head: () => ({
    meta: [
      { title: "Healthy Grocery Delivery & Meal Prep Guide" },
      { name: "description", content: "Learn how healthy grocery delivery and fresh-cut vegetables can make weekly meal prep faster, simpler and easier to maintain." },
      { property: "og:title", content: "Healthy Grocery Delivery & Meal Prep Guide" },
      { property: "og:description", content: "A practical guide to saving meal-prep time with fresh-cut produce and well-timed grocery delivery." },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Make Healthy Grocery Delivery Work for Weekly Meal Prep",
          description: "A practical guide to saving meal-prep time with fresh-cut vegetables and well-timed grocery delivery.",
          author: { "@type": "Organization", name: "Velocity Kitchen" },
          publisher: { "@type": "Organization", name: "Velocity Kitchen" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: HealthyGroceryDeliveryGuide,
});

function HealthyGroceryDeliveryGuide() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Meal prep guide</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">
          How to make healthy grocery delivery work for weekly meal prep
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Healthy eating becomes easier when ingredients arrive fresh, prepared and timed around the meals you plan to cook.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Why traditional grocery delivery still leaves work behind</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Whole-produce deliveries save a trip to the shop, but washing, peeling, chopping and portioning can still consume much of your evening. Fresh-cut vegetable delivery removes those repetitive steps, helping busy professionals and families move from ingredients to a cooked meal faster.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">A four-step meal-prep system</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { icon: ListChecks, title: "Plan a short menu", text: "Choose three or four flexible meals that share vegetables, grains and proteins." },
            { icon: Leaf, title: "Order prepared produce", text: "Select recipe-ready cuts and kits in portions your household will use." },
            { icon: Truck, title: "Time the delivery", text: "Use morning delivery for same-day lunches or evening delivery before dinner prep." },
            { icon: Clock, title: "Cook once, reuse wisely", text: "Prepare bases such as roasted vegetables or curry kits, then vary sauces and sides." },
          ].map((step) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-5">
              <step.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">How twice-daily delivery improves freshness</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Smaller, well-timed orders reduce the need to store cut produce for several days. Velocity Kitchen offers morning and evening slots, so you can match delivery to your cooking routine, keep the refrigerator organised and use ingredients closer to the time they were prepared.
        </p>
      </section>

      <section className="mt-10 rounded-3xl bg-secondary/60 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Build your next quick meal</h2>
        <p className="mt-2 text-muted-foreground">Browse fresh cuts, ready-to-cook kits, salads and juices prepared for convenient home delivery.</p>
        <Button asChild className="mt-5 rounded-full">
          <Link to="/shop">Shop fresh ingredients <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </section>
    </article>
  );
}