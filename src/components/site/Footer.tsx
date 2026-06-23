import { Clock, Truck, Phone, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_TEL, BRAND_EMAIL } from "@/lib/whatsapp";
import logoAsset from "@/assets/velocity-kitchen-logo.jpeg.asset.json";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img
              src={logoAsset.url}
              alt="Velocity Kitchen"
              className="h-9 w-auto object-contain shrink-0"
              loading="lazy"
              decoding="async"
            />
            <span className="font-bold text-lg">
              Velocity <span className="text-primary">Kitchen</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Spend less time in the kitchen and more time living.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop" hash="kits">Kits</Link></li>
            <li><Link to="/shop" hash="fresh-cuts">Fresh Cuts</Link></li>
            <li><Link to="/shop" hash="ready">Ready to Eat & Drink</Link></li>
            <li><Link to="/shop" hash="pantry">Pantry</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Delivery</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Morning 6:00 AM – 8:00 AM</li>
            <li>Evening 5:00 PM – 8:00 PM</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4" />Free above Rs 200/-</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Get in touch</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href={`tel:${BRAND_PHONE_TEL}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                {BRAND_PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${BRAND_EMAIL}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                {BRAND_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Velocity Kitchen. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
