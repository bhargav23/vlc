import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

type Row = { id: string; name: string; price: number; unit: string; emoji: string; tag: string | null; active: boolean; group_id: string; group_name: string; category_title: string; image_url: string | null; is_exclusive: boolean };

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [q, setQ] = useState("");

  const { data: groups = [] } = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: async () => {
      const { data } = await supabase.from("product_groups").select("id,name,category_id,categories(title)").order("sort_order");
      return (data ?? []).map((g) => ({ id: g.id, name: g.name, categoryTitle: (g.categories as { title: string } | null)?.title ?? "" }));
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*,product_groups(name,categories(title))").order("name");
      return (data ?? []).map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), unit: p.unit, emoji: p.emoji, tag: p.tag,
        active: p.active, group_id: p.group_id,
        image_url: (p as { image_url?: string | null }).image_url ?? null,
        is_exclusive: (p as { is_exclusive?: boolean }).is_exclusive ?? false,
        group_name: (p.product_groups as { name: string } | null)?.name ?? "",
        category_title: ((p.product_groups as { categories: { title: string } | null } | null)?.categories?.title) ?? "",
      })) as Row[];
    },
  });

  const filtered = rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.group_id) return toast.error("Name and group required");
    const payload = {
      name: editing.name,
      price: editing.price ?? 0,
      unit: editing.unit ?? "",
      emoji: editing.emoji || "🥗",
      tag: editing.tag || null,
      active: editing.active ?? true,
      group_id: editing.group_id,
      image_url: editing.image_url ?? null,
      is_exclusive: editing.is_exclusive ?? false,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) {
      logger.error("[admin.products] save:", error);
      return toast.error("Could not save product. Please try again.");
    }
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      logger.error("[admin.products] delete:", error);
      return toast.error("Could not delete product. Please try again.");
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const toggle = async (r: Row) => {
    await supabase.from("products").update({ active: !r.active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const [uploading, setUploading] = useState(false);
  const pathFromPublicUrl = (url: string | null | undefined) => {
    if (!url) return null;
    const marker = "/product-images/";
    const i = url.indexOf(marker);
    return i === -1 ? null : url.slice(i + marker.length);
  };
  const onPickImage = async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      logger.error("[admin.products] upload:", error);
      setUploading(false);
      return toast.error("Upload failed. Please try again.");
    }
    const prev = pathFromPublicUrl(editing.image_url);
    if (prev) {
      const { error: delErr } = await supabase.storage.from("product-images").remove([prev]);
      if (delErr) logger.error("[admin.products] remove prev:", delErr);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing({ ...editing, image_url: data.publicUrl });
    setUploading(false);
  };

  const onRemoveImage = async () => {
    if (!editing) return;
    const prev = pathFromPublicUrl(editing.image_url);
    if (prev) {
      const { error } = await supabase.storage.from("product-images").remove([prev]);
      if (error) {
        logger.error("[admin.products] remove:", error);
        return toast.error("Could not remove image. Please try again.");
      }
    }
    setEditing({ ...editing, image_url: null });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <Button className="rounded-full" onClick={() => setEditing({ active: true, emoji: "🥗", price: 0 })}><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>
      <Input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase">
            <tr><th className="p-3 text-left">Product</th><th className="p-3 text-left hidden sm:table-cell">Category</th><th className="p-3 text-right">Price</th><th className="p-3 text-center">Active</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-secondary/60 overflow-hidden grid place-items-center text-lg shrink-0">
                      {r.image_url ? <img src={r.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <span aria-hidden>{r.emoji}</span>}
                    </div>
                    <span>{r.name} <span className="text-muted-foreground text-xs">· {r.unit}</span></span>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{r.category_title} / {r.group_name}</td>
                <td className="p-3 text-right">Rs {r.price}</td>
                <td className="p-3 text-center"><Switch checked={r.active} onCheckedChange={() => toggle(r)} /></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>Image</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg bg-secondary/60 overflow-hidden grid place-items-center text-2xl">
                    {editing.image_url ? (
                      <img src={editing.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span aria-hidden>{editing.emoji || "🥗"}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); }} />
                    {editing.image_url && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => void onRemoveImage()}>Remove image</Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Emoji</Label><Input value={editing.emoji ?? ""} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} /></div>
                <div><Label>Price</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>Unit</Label><Input value={editing.unit ?? ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></div>
              </div>
              <div><Label>Tag (optional)</Label><Input value={editing.tag ?? ""} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} /></div>
              <div>
                <Label>Group</Label>
                <Select value={editing.group_id ?? ""} onValueChange={(v) => setEditing({ ...editing, group_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.categoryTitle} / {g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> <Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_exclusive ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_exclusive: v })} /> <Label>Festival-exclusive (only orderable during an active promotion)</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
