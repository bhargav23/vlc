import { Sparkles, Truck } from "lucide-react";
import { useActivePromotions } from "@/lib/catalog";

export function AnnouncementBar() {
  const { data: promos = [] } = useActivePromotions();
  const promo = promos.find((p) => p.banner_text && p.banner_text.trim().length > 0) ?? promos[0];

  if (promo) {
    const style = promo.accent_color ? { backgroundColor: promo.accent_color } : undefined;
    return (
      <div className={`text-primary-foreground text-xs sm:text-sm ${promo.accent_color ? "" : "bg-band"}`} style={style}>
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-2 text-center">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{promo.banner_text || `${promo.name} — Festival Specials are live`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-band text-primary-foreground text-xs sm:text-sm">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-2 text-center">
        <Truck className="h-4 w-4 shrink-0" />
        <span className="font-medium">Free delivery for orders above Rs 200/-</span>
      </div>
    </div>
  );
}
