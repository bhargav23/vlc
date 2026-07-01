import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCart, computeTotals } from "@/lib/cart";
import { logWhatsAppOrderIntent } from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";

export function WhatsAppFAB() {
  const { items, subtotal } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logIntent = useServerFn(logWhatsAppOrderIntent);

  if (pathname.startsWith("/admin")) return null;
  if (items.length === 0) return null;

  const { delivery, total } = computeTotals(subtotal);

  const onClick = () => {
    void logIntent({
      data: { source: "fab", item_count: items.length, total },
    }).catch(() => {});
  };

  return (
    <Button asChild className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/40 bg-whatsapp text-whatsapp-foreground">
      <Link to="/checkout" onClick={onClick} aria-label="Go to checkout">
        <WhatsAppIcon className="h-7 w-7" />
      </Link>
    </Button>
  );
}
