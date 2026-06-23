import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in — Velocity Kitchen" }, { name: "robots", content: "noindex" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { user, isAdmin, loading, roleLoading, roleError, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdminCheck, setPendingAdminCheck] = useState(false);

  // If already signed in as admin, go to dashboard.
  useEffect(() => {
    if (!loading && !roleLoading && user && isAdmin) navigate({ to: "/admin" });
  }, [user, isAdmin, loading, roleLoading, navigate]);

  useEffect(() => {
    if (!pendingAdminCheck || loading || roleLoading || !user) return;

    setPendingAdminCheck(false);

    if (roleError) {
      toast.error(roleError);
      return;
    }

    if (isAdmin) {
      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
      return;
    }

    void signOut();
    toast.error("This account does not have admin access.");
  }, [pendingAdminCheck, loading, roleLoading, user, isAdmin, roleError, navigate, signOut]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setSubmitting(false);
      return toast.error(error);
    }
    setSubmitting(false);
    setPendingAdminCheck(true);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center text-primary">
            <Shield className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold">Admin sign in</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Restricted area. Admin credentials required.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-full">
            {submitting ? "Signing in…" : "Sign in to Admin"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Not an admin? <Link to="/login" className="text-primary font-semibold">Customer sign in</Link>
        </p>
      </div>
    </div>
  );
}
