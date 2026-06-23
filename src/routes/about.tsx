import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Clock, Truck, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Velocity Kitchen" },
      { name: "description", content: "We deliver health to your door — fresh-cut, ready and wholesome." },
      { property: "og:title", content: "About Velocity Kitchen" },
      { property: "og:description", content: "Spend less time in the kitchen and more time living." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/about" }],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20">
      <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
        Spend less time in the kitchen.<br />
        <span className="text-primary">More time living.</span>
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        Velocity Kitchen was built for busy households that still want to eat well.
        We source produce daily, wash it, cut it to your recipe, and deliver it twice a day —
        so dinner takes minutes, not hours.
      </p>

      <h2 className="mt-12 text-2xl sm:text-3xl font-bold">Why Velocity Kitchen</h2>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {[
          { icon: Leaf, title: "Farm-fresh, daily", desc: "Sourced and cut every morning. Nothing sits overnight." },
          { icon: Clock, title: "Twice daily delivery", desc: "Morning 6–8 AM and Evening 5–8 PM, every day." },
          { icon: Truck, title: "Free above Rs 200/-", desc: "Reliable delivery across your neighbourhood." },
          { icon: Heart, title: "Made with care", desc: "Wholesome, additive-free salads, kits and juices." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
            <span className="h-10 w-10 grid place-items-center rounded-full bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-bold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
