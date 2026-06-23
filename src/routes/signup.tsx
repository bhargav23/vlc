import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Velocity Kitchen" },
      { name: "description", content: "Create your Velocity Kitchen account to place orders and manage subscriptions." },
      { property: "og:title", content: "Create account — Velocity Kitchen" },
      { property: "og:description", content: "Join Velocity Kitchen — fresh-cut food delivered twice daily." },
      { property: "og:url", content: "https://velocitykitchen.lovable.app/signup" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://velocitykitchen.lovable.app/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success("Account created — check your email if confirmation is required.");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">Create account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join Velocity Kitchen — fresh-cut food delivered daily.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">{loading ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Already have one? <Link to="/login" className="text-primary font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
