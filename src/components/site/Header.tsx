import { Link } from "@tanstack/react-router";
import { ShoppingCart, Menu, X, Shield, LogOut, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import logoAsset from "@/assets/velocity-kitchen-logo.jpeg.asset.json";

const nav = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/85 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group" aria-label="Velocity Kitchen home">
          <img
            src={logoAsset.url}
            alt="Velocity Kitchen"
            className="h-10 sm:h-12 w-auto object-contain shrink-0"
            loading="eager"
            decoding="async"
          />
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors translate-y-px whitespace-nowrap">Velocity Kitchen</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors" activeProps={{ className: "text-foreground" }}>
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="px-3 py-2 text-sm font-semibold text-primary rounded-md flex items-center gap-1">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="ghost" size="icon" className="md:hidden rounded-full" aria-label="Admin">
              <Link to="/admin"><Shield className="h-5 w-5 text-primary" /></Link>
            </Button>
          )}
          {user ? (
            <Button variant="ghost" size="sm" className="rounded-full hidden sm:inline-flex" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="rounded-full hidden sm:inline-flex">
              <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> Sign in</Link>
            </Button>
          )}
          <Button asChild variant="default" size="sm" className="rounded-full gap-2">
            <Link to="/checkout">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 text-xs">{count}</span>
            </Link>
          </Button>
          <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="md:hidden h-9 w-9 grid place-items-center rounded-md border border-border" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-2 flex flex-col">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-3 text-sm font-medium border-b border-border last:border-0">{n.label}</Link>
            ))}
            {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="py-3 text-sm font-semibold text-primary">Admin</Link>}
            {user ? (
              <button onClick={() => { setOpen(false); signOut(); }} className="py-3 text-sm font-medium text-left">Sign out</button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="py-3 text-sm font-medium">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
