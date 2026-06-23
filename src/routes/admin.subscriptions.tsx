import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { creditSubscription } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/admin/subscriptions")({ component: AdminSubs });

type Tier = { id?: string; name: string; price_paid: number; credit_value: number; free_delivery: boolean; active: boolean; sort_order: number };

function AdminSubs() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Tier | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditEmail, setCreditEmail] = useState("");
  const [creditTier, setCreditTier] = useState("");
  const [crediting, setCrediting] = useState(false);
  const creditFn = useServerFn(creditSubscription);


  const { data: tiers = [] } = useQuery({
    queryKey: ["admin", "tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_tiers").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: subs = [] } = useQuery({
    queryKey: ["admin", "user_subs"],
    queryFn: async () => {
      const { data } = await supabase.from("user_subscriptions").select("*,subscription_tiers(name)").order("purchased_at", { ascending: false });
      return data ?? [];
    },
  });

  const save = async () => {
    if (!editing) return;
    const { error } = editing.id
      ? await supabase.from("subscription_tiers").update(editing).eq("id", editing.id)
      : await supabase.from("subscription_tiers").insert(editing);
    if (error) {
      console.error("[admin.subscriptions] save tier:", error);
      return toast.error("Could not save tier. Please try again.");
    }
    setEditing(null);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin", "tiers"] });
    qc.invalidateQueries({ queryKey: ["tiers"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete tier?")) return;
    await supabase.from("subscription_tiers").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "tiers"] });
    qc.invalidateQueries({ queryKey: ["tiers"] });
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">Subscription tiers</h1>
          <Button className="rounded-full" onClick={() => setEditing({ name: "", price_paid: 0, credit_value: 0, free_delivery: false, active: true, sort_order: tiers.length + 1 })}>
            <Plus className="h-4 w-4 mr-1" /> New tier
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-right">Pay</th><th className="p-3 text-right">Value</th><th className="p-3 text-center">Free delivery</th><th className="p-3 text-center">Active</th><th></th></tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{t.name}</td>
                  <td className="p-3 text-right">Rs {Number(t.price_paid)}</td>
                  <td className="p-3 text-right">Rs {Number(t.credit_value)}</td>
                  <td className="p-3 text-center">{t.free_delivery ? "✓" : "—"}</td>
                  <td className="p-3 text-center">{t.active ? "✓" : "—"}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...t, price_paid: Number(t.price_paid), credit_value: Number(t.credit_value) })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Active customer subscriptions</h2>
          <Button className="rounded-full" variant="outline" onClick={() => { setCreditEmail(""); setCreditTier(tiers[0]?.id ?? ""); setCreditOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-1" /> Credit a user
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase">
              <tr><th className="p-3 text-left">Purchased</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Tier</th><th className="p-3 text-right">Balance</th></tr>
            </thead>
            <tbody>
              {subs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No active subscriptions</td></tr>}
              {subs.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 text-xs">{new Date(s.purchased_at).toLocaleDateString()}</td>
                  <td className="p-3 text-xs font-mono">{s.user_id.slice(0, 8)}…</td>
                  <td className="p-3">{(s.subscription_tiers as { name: string } | null)?.name ?? "—"}</td>
                  <td className="p-3 text-right font-semibold">Rs {Number(s.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit tier" : "New tier"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Pay (Rs)</Label><Input type="number" value={editing.price_paid} onChange={(e) => setEditing({ ...editing, price_paid: Number(e.target.value) })} /></div>
                <div><Label>Value (Rs)</Label><Input type="number" value={editing.credit_value} onChange={(e) => setEditing({ ...editing, credit_value: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.free_delivery} onCheckedChange={(v) => setEditing({ ...editing, free_delivery: v })} /> <Label>Free delivery</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> <Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Credit a user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer email</Label>
              <Input type="email" placeholder="customer@example.com" value={creditEmail} onChange={(e) => setCreditEmail(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">The customer must have signed up on the website first.</p>
            </div>
            <div>
              <Label>Tier</Label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={creditTier} onChange={(e) => setCreditTier(e.target.value)}>
                {tiers.filter((t) => t.active).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — Rs {Number(t.price_paid)} → Rs {Number(t.credit_value)}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={crediting || !creditEmail || !creditTier}
              onClick={async () => {
                setCrediting(true);
                try {
                  const res = await creditFn({ data: { email: creditEmail.trim(), tier_id: creditTier } });
                  toast.success(`Credited ${res.tier_name} (Rs ${res.balance})`);
                  setCreditOpen(false);
                  qc.invalidateQueries({ queryKey: ["admin", "user_subs"] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not credit user.");
                } finally {
                  setCrediting(false);
                }
              }}
            >
              {crediting ? "Crediting…" : "Credit subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
