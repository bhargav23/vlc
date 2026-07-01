import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/promotions")({ component: AdminPromotions });

type Promo = {
  id: string;
  name: string;
  slug: string;
  banner_text: string | null;
  description: string | null;
  accent_color: string | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
};

type PromoItem = {
  id: string;
  promotion_id: string;
  product_id: string;
  discount_type: "percent" | "fixed_price";
  discount_value: number;
};

type ProductLite = { id: string; name: string; price: number; is_exclusive: boolean };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `promo-${Date.now()}`;
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : "";
}

function statusOf(p: Promo): { label: string; tone: string } {
  const now = Date.now();
  const start = new Date(p.starts_at).getTime();
  const end = new Date(p.ends_at).getTime();
  if (!p.active) return { label: "Paused", tone: "bg-muted text-muted-foreground" };
  if (now < start) return { label: "Scheduled", tone: "bg-accent/40 text-accent-foreground" };
  if (now > end) return { label: "Ended", tone: "bg-muted text-muted-foreground" };
  return { label: "Live", tone: "bg-tomato/15 text-tomato" };
}

function AdminPromotions() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);

  const { data: promos = [] } = useQuery({
    queryKey: ["admin", "promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Promo[];
    },
  });

  const { data: itemCounts = {} } = useQuery({
    queryKey: ["admin", "promotion_items_count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotion_items").select("promotion_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.promotion_id] = (map[r.promotion_id] ?? 0) + 1;
      return map;
    },
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.starts_at || !editing.ends_at) return toast.error("Name and date range are required");
    if (new Date(editing.ends_at).getTime() <= new Date(editing.starts_at).getTime()) {
      return toast.error("End date must be after start date");
    }
    const payload = {
      name: editing.name.trim(),
      slug: editing.slug?.trim() || slugify(editing.name),
      banner_text: editing.banner_text?.trim() || null,
      description: editing.description?.trim() || null,
      accent_color: editing.accent_color?.trim() || null,
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("promotions").update(payload).eq("id", editing.id)
      : await supabase.from("promotions").insert(payload);
    if (error) {
      logger.error("[admin.promotions] save:", error);
      return toast.error("Could not save promotion. Please try again.");
    }
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
    qc.invalidateQueries({ queryKey: ["promotions", "active"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promotion? Linked items will be removed.")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) {
      logger.error("[admin.promotions] delete:", error);
      return toast.error("Could not delete promotion.");
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
    qc.invalidateQueries({ queryKey: ["promotions", "active"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const toggle = async (p: Promo) => {
    await supabase.from("promotions").update({ active: !p.active }).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
    qc.invalidateQueries({ queryKey: ["promotions", "active"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><Sparkles className="h-5 w-5 text-tomato" /> Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule festival offers and unlock exclusive products during the window.</p>
        </div>
        <Button className="rounded-full" onClick={() => setEditing({ active: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 7 * 86400_000).toISOString() })}>
          <Plus className="h-4 w-4 mr-1" /> New promotion
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left hidden sm:table-cell">Window</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No promotions yet. Create one to kick off a festival sale.</td></tr>
            )}
            {promos.map((p) => {
              const s = statusOf(p);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-semibold">{p.name}</div>
                    {p.banner_text && <div className="text-xs text-muted-foreground line-clamp-1">{p.banner_text}</div>}
                  </td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground text-xs">
                    {new Date(p.starts_at).toLocaleString()}<br />→ {new Date(p.ends_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <button className="underline underline-offset-2" onClick={() => setManagingId(p.id)}>
                      {itemCounts[p.id] ?? 0}
                    </button>
                  </td>
                  <td className="p-3 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span></td>
                  <td className="p-3 text-center"><Switch checked={p.active} onCheckedChange={() => toggle(p)} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setManagingId(p.id)}>Items</Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit promotion" : "New promotion"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} placeholder="Diwali Specials" />
              </div>
              <div>
                <Label>Banner text (shown across the site)</Label>
                <Input value={editing.banner_text ?? ""} maxLength={140} onChange={(e) => setEditing({ ...editing, banner_text: e.target.value })} placeholder="Diwali Specials — up to 25% off festive picks ✨" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Festive kits and sweets, available only this week." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Starts at</Label>
                  <Input type="datetime-local" value={toLocalInput(editing.starts_at)} onChange={(e) => setEditing({ ...editing, starts_at: fromLocalInput(e.target.value) })} />
                </div>
                <div>
                  <Label>Ends at</Label>
                  <Input type="datetime-local" value={toLocalInput(editing.ends_at)} onChange={(e) => setEditing({ ...editing, ends_at: fromLocalInput(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <Label>Accent color (optional)</Label>
                  <Input type="text" placeholder="#c4654a" value={editing.accent_color ?? ""} onChange={(e) => setEditing({ ...editing, accent_color: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {managingId && (
        <ItemsManager promotionId={managingId} onClose={() => setManagingId(null)} />
      )}
    </div>
  );
}

function ItemsManager({ promotionId, onClose }: { promotionId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"percent" | "fixed_price">("percent");
  const [value, setValue] = useState<string>("10");
  const [productId, setProductId] = useState<string>("");

  const { data: items = [] } = useQuery({
    queryKey: ["admin", "promotion_items", promotionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotion_items").select("*").eq("promotion_id", promotionId);
      if (error) throw error;
      return (data ?? []) as PromoItem[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products_lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,price,is_exclusive").eq("active", true).order("name");
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, price: Number(p.price) })) as ProductLite[];
    },
  });

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const taken = useMemo(() => new Set(items.map((i) => i.product_id)), [items]);
  const filtered = useMemo(
    () => products.filter((p) => !taken.has(p.id) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))),
    [products, taken, q],
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "promotion_items", promotionId] });
    qc.invalidateQueries({ queryKey: ["admin", "promotion_items_count"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const add = async () => {
    if (!productId) return toast.error("Pick a product");
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0) return toast.error("Enter a valid value");
    if (type === "percent" && v > 100) return toast.error("Percent must be 0–100");
    const { error } = await supabase.from("promotion_items").insert({
      promotion_id: promotionId,
      product_id: productId,
      discount_type: type,
      discount_value: v,
    });
    if (error) {
      logger.error("[admin.promotions] add item:", error);
      return toast.error(error.code === "23505" ? "That product is already in another promotion item." : "Could not add product.");
    }
    setProductId("");
    setValue(type === "percent" ? "10" : "0");
    invalidateAll();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("promotion_items").delete().eq("id", id);
    if (error) return toast.error("Could not remove.");
    invalidateAll();
  };

  const preview = (it: PromoItem) => {
    const p = productMap.get(it.product_id);
    if (!p) return null;
    const sale = it.discount_type === "percent"
      ? Math.max(0, Math.round((p.price * (100 - Number(it.discount_value))) / 100))
      : Math.max(0, Math.min(p.price, Math.round(Number(it.discount_value))));
    const pct = p.price > 0 ? Math.round(((p.price - sale) / p.price) * 100) : 0;
    return `Rs ${p.price} → Rs ${sale} (−${pct}%)`;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Promotion items</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-3 grid sm:grid-cols-[1fr_140px_120px_auto] gap-2 items-end">
            <div>
              <Label>Product</Label>
              <Input className="mb-2" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Pick a product" /></SelectTrigger>
                <SelectContent>
                  {filtered.slice(0, 50).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — Rs {p.price}{p.is_exclusive ? " (exclusive)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "percent" | "fixed_price")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">% off</SelectItem>
                  <SelectItem value="fixed_price">Sale price (Rs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{type === "percent" ? "% off" : "Sale price"}</Label>
              <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <Button onClick={add} className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border max-h-80 overflow-auto">
            {items.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm">No products linked yet.</div>
            )}
            {items.map((it) => {
              const p = productMap.get(it.product_id);
              return (
                <div key={it.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p?.name ?? it.product_id}</div>
                    <div className="text-xs text-muted-foreground">{preview(it)}</div>
                  </div>
                  <span className="text-xs rounded-full bg-secondary px-2 py-0.5">
                    {it.discount_type === "percent" ? `${it.discount_value}% off` : `Rs ${it.discount_value}`}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}><X className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
