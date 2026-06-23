import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { LayoutDashboard, Package, ClipboardList, Wallet, Shield, FolderTree, Sparkles, Image as ImageIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { recordAdminAccess } from "@/lib/audit.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Velocity Kitchen" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/site", label: "Site", icon: ImageIcon },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/promotions", label: "Promotions", icon: Sparkles },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Wallet },
  { to: "/admin/audit", label: "Audit log", icon: Shield },
];

function AdminLayout() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginRoute = pathname === "/admin/login";
  const resolving = loading || (!!user && roleLoading);
  const logAdminAccess = useServerFn(recordAdminAccess);
  const lastLoggedPath = useRef<string | null>(null);

  useEffect(() => {
    if (resolving || isLoginRoute) return;
    if (!user) navigate({ to: "/admin/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [user, isAdmin, resolving, navigate, isLoginRoute]);

  useEffect(() => {
    if (resolving || isLoginRoute || !user || !isAdmin) return;
    if (lastLoggedPath.current === pathname) return;
    lastLoggedPath.current = pathname;
    void logAdminAccess({ data: { path: pathname } }).catch(() => {});
  }, [resolving, isLoginRoute, user, isAdmin, pathname, logAdminAccess]);

  if (isLoginRoute) {
    return <Outlet />;
  }

  if (resolving || !user || !isAdmin) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">Checking access…</div>;
  }


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 grid lg:grid-cols-[220px_1fr] gap-8">
      <aside>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center text-primary"><Shield className="h-4 w-4" /></span>
          <h2 className="font-bold">Admin</h2>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${active ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"}`}>
                <Icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}
