import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCart, computeTotals } from "@/lib/cart";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";
import { logWhatsAppOrderIntent } from "@/lib/audit.functions";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";

export function WhatsAppFAB() {
  const { items, subtotal } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logIntent = useServerFn(logWhatsAppOrderIntent);

  if (pathname.startsWith("/admin")) return null;
  if (items.length === 0) return null;

  const { delivery, total } = computeTotals(subtotal);
  const href = buildWhatsAppOrderUrl({ items, subtotal, delivery, total });

  const onClick = () => {
    // Fire-and-forget; do not block opening WhatsApp.
    void logIntent({
      data: { source: "fab", item_count: items.length, total },
    }).catch(() => {});
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Order on WhatsApp"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full grid place-items-center shadow-lg bg-whatsapp text-whatsapp-foreground transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/40"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
