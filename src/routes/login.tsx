import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Velocity Kitchen" },
      { name: "description", content: "Sign in to your Velocity Kitchen account to place orders and manage subscriptions." },
      { property: "og:title", content: "Sign in — Velocity Kitchen" },
      { property: "og:description", content: "Sign in to your Velocity Kitchen account." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/login" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) { setLoading(false); return toast.error(error); }
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!role;
    }
    setLoading(false);
    toast.success("Welcome back!");
    navigate({ to: isAdmin ? "/admin" : "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back to Velocity Kitchen.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">{loading ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          New here? <Link to="/signup" className="text-primary font-semibold">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
