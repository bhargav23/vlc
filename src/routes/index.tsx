import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Sparkles, Truck, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImgDefault from "@/assets/hero.jpg";
import { useCatalog } from "@/lib/catalog";
import { CategorySection } from "@/components/site/CategorySection";
import { FestivalSpecials } from "@/components/site/FestivalSpecials";
import { SITE_SETTING_KEYS, useSiteSetting, DEFAULT_HERO_FIT, DEFAULT_HERO_POSITION, type HeroFit } from "@/lib/site-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fresh Cut Vegetables Delivery | Velocity Kitchen" },
      { name: "description", content: "Order fresh-cut vegetables, ready-to-cook kits, salads and cold-pressed juices from Velocity Kitchen, delivered twice daily." },
      { property: "og:title", content: "Fresh Cut Vegetables Delivery | Velocity Kitchen" },
      { property: "og:description", content: "Fresh-cut vegetables, meal kits, salads and juices prepared daily and delivered to your door." },
      { name: "twitter:title", content: "Fresh Cut Vegetables Delivery | Velocity Kitchen" },
      { name: "twitter:description", content: "Fresh-cut vegetables, meal kits, salads and juices prepared daily and delivered to your door." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://velocitykitchen.lovable.app/" },
      { rel: "preload", as: "image", href: heroImgDefault, fetchpriority: "high" } as unknown as { rel: string; href: string },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: categories = [] } = useCatalog();
  const { data: heroOverride } = useSiteSetting(SITE_SETTING_KEYS.heroImage);
  const { data: heroFitRaw } = useSiteSetting(SITE_SETTING_KEYS.heroFit);
  const { data: heroPositionRaw } = useSiteSetting(SITE_SETTING_KEYS.heroPosition);
  const heroImg = heroOverride || heroImgDefault;
  const heroFit: HeroFit = heroFitRaw === "contain" ? "contain" : DEFAULT_HERO_FIT;
  const heroPosition = heroPositionRaw || DEFAULT_HERO_POSITION;
  const featured = categories.find((c) => c.slug === "fresh-cuts") ?? categories[0];
  return (
    <div>
      <section className="bg-hero-gradient overflow-x-clip">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:pt-16 sm:pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Cut fresh every morning
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05]">
              Fresh-cut vegetables <span className="text-primary">delivered</span> to your door
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              Spend less time in the kitchen and more time living. Fresh-cut veggies,
              ready-to-cook kits, vibrant salads and cold-pressed juices — delivered twice a day.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full gap-2">
                <Link to="/shop">Shop fresh <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/subscriptions">View Subscriptions</Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              {[
                { icon: Leaf, label: "100% Fresh" },
                { icon: Truck, label: "Twice-daily delivery" },
                { icon: Clock, label: "Cut to order" },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-card border border-border p-3 text-center">
                  <f.icon className="h-5 w-5 mx-auto text-primary" />
                  <p className="text-xs font-medium mt-1.5">{f.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[5/4] rounded-3xl overflow-hidden shadow-[var(--shadow-pop)] ring-1 ring-border bg-secondary/40">
              <img
                src={heroImg}
                alt="Freshly cut vegetables, leafy greens and a green health juice on a marble surface"
                width={1600}
                height={1200}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full"
                style={{ objectFit: heroFit, objectPosition: heroPosition }}
              />
            </div>
            <div className="absolute bottom-3 left-3 sm:-bottom-5 sm:-left-6 rounded-2xl bg-card border border-border shadow-[var(--shadow-soft)] p-3 sm:p-4 flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-primary/15 grid place-items-center text-primary">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Free delivery</p>
                <p className="text-sm font-semibold">on orders above Rs 200/-</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 -mt-2 sm:mt-2">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 grid sm:grid-cols-3 gap-4 items-center">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-full bg-accent/20 grid place-items-center text-accent-foreground">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Timings</p>
              <p className="text-base font-bold">Twice every day</p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/60 p-4 text-center">
            <p className="text-xs text-muted-foreground">Morning Slot</p>
            <p className="font-bold text-lg">6:00 AM – 8:00 AM</p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-4 text-center">
            <p className="text-xs text-muted-foreground">Evening Slot</p>
            <p className="font-bold text-lg">5:00 PM – 8:00 PM</p>
          </div>
        </div>
      </section>

      <FestivalSpecials />

      <section className="mx-auto max-w-7xl px-4 mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold">Shop by category</h2>
        <p className="text-muted-foreground text-sm mt-1">Everything fresh, organised the way you cook.</p>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((c, i) => {
            const colors = ["bg-primary/10 text-primary", "bg-accent/20 text-accent-foreground", "bg-tomato/15 text-tomato", "bg-secondary text-secondary-foreground"];
            const emojis = ["🥘", "🥕", "🥤", "🌶️"];
            return (
              <Link key={c.id} to="/shop" hash={c.slug} className="group rounded-2xl border border-border bg-card p-5 hover:shadow-[var(--shadow-pop)] transition-all hover:-translate-y-0.5">
                <div className={`h-14 w-14 rounded-2xl grid place-items-center text-3xl ${colors[i % 4]}`}>{emojis[i % 4]}</div>
                <h3 className="mt-4 font-bold">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Browse <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {featured && (
        <section className="mx-auto max-w-7xl px-4 mt-20">
          <CategorySection category={featured} />
          <div className="mt-8 text-center">
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/shop">View full menu <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 mt-20 mb-16">
        <div className="rounded-3xl bg-band text-primary-foreground p-8 sm:p-12 text-center relative overflow-hidden">
          <Sparkles className="absolute top-4 right-6 h-8 w-8 opacity-30" />
          <h2 className="text-2xl sm:text-3xl font-bold">Save more with Prepaid Subscriptions</h2>
          <p className="mt-2 text-primary-foreground/90 max-w-xl mx-auto">Top up your wallet and get up to 20% extra value plus free delivery.</p>
          <Button asChild size="lg" variant="secondary" className="mt-5 rounded-full">
            <Link to="/subscriptions">See offers <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
