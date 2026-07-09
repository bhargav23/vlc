import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";

import { logger } from "@/lib/logger";

// Inline the processed Tailwind output into the SSR shell so the page has
// zero render-blocking stylesheet requests and no FOUC. Vite returns the
// compiled CSS as a string with `?inline`.
import appCssInline from "../styles.css?inline";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppFAB } from "@/components/site/WhatsAppFAB";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  logger.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Try again</button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#16a34a" },
      { title: "Fresh-Cut Vegetable Delivery | Velocity Kitchen" },
      { name: "description", content: "Spend less time in the kitchen. Order fresh-cut vegetables, ready-to-cook kits, and cold-pressed juices delivered twice daily. Free delivery above Rs 200/-." },
      { property: "og:site_name", content: "Velocity Kitchen" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Fresh-Cut Vegetable Delivery | Velocity Kitchen" },
      { property: "og:description", content: "Spend less time in the kitchen. Order fresh-cut vegetables, ready-to-cook kits, and cold-pressed juices delivered twice daily. Free delivery above Rs 200/-." },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Velocity Kitchen",
          image: "https://velocitykitchen.in/assets/velocity-kitchen-logo-D7uSYwba.jpeg",
          telephone: "+919493223259",
          email: "velocitykitchen3259@gmail.com",
          url: "https://velocitykitchen.in",
          priceRange: "₹",
          description: "Fresh-cut vegetables, ready-to-cook kits, and cold-pressed juices delivered twice daily.",
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              opens: "06:00",
              closes: "20:00",
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Velocity Kitchen",
          url: "https://velocitykitchen.in",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: appCssInline }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col">
            <AnnouncementBar />
            <Header />
            <main className="flex-1"><Outlet /></main>
            <Footer />
          </div>
          <WhatsAppFAB />
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
