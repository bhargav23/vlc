import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCategories,
});

type Category = { id: string; title: string; slug: string; description: string | null; sort_order: number };
type Group = { id: string; name: string; category_id: string; sort_order: number };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["admin", "groups-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_groups").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Group[];
    },
  });

  const saveCat = async () => {
    if (!editingCat) return;
    const title = editingCat.title?.trim();
    if (!title) return toast.error("Title required");
    const payload = {
      title,
      slug: editingCat.slug?.trim() || slugify(title),
      description: editingCat.description || null,
      sort_order: editingCat.sort_order ?? 0,
    };
    const { error } = editingCat.id
      ? await supabase.from("categories").update(payload).eq("id", editingCat.id)
      : await supabase.from("categories").insert(payload);
    if (error) {
      console.error("[admin.categories] save:", error);
      return toast.error("Could not save category. Please try again.");
    }
    toast.success("Saved");
    setEditingCat(null);
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const removeCat = async (id: string) => {
    if (!confirm("Delete this category? Its groups and products must be removed first.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      console.error("[admin.categories] delete:", error);
      return toast.error("Could not delete category. Please remove its groups first.");
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  };

  const saveGroup = async () => {
    if (!editingGroup) return;
    const name = editingGroup.name?.trim();
    if (!name || !editingGroup.category_id) return toast.error("Name and category required");
    const payload = {
      name,
      category_id: editingGroup.category_id,
      sort_order: editingGroup.sort_order ?? 0,
    };
    const { error } = editingGroup.id
      ? await supabase.from("product_groups").update(payload).eq("id", editingGroup.id)
      : await supabase.from("product_groups").insert(payload);
    if (error) {
      console.error("[admin.categories] saveGroup:", error);
      return toast.error("Could not save group. Please try again.");
    }
    toast.success("Saved");
    setEditingGroup(null);
    qc.invalidateQueries({ queryKey: ["admin", "groups-all"] });
    qc.invalidateQueries({ queryKey: ["admin", "groups"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Delete this group? Its products must be removed first.")) return;
    const { error } = await supabase.from("product_groups").delete().eq("id", id);
    if (error) {
      console.error("[admin.categories] deleteGroup:", error);
      return toast.error("Could not delete group. Please remove its products first.");
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", "groups-all"] });
    qc.invalidateQueries({ queryKey: ["admin", "groups"] });
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-extrabold">Categories</h1>
          <Button className="rounded-full" onClick={() => setEditingCat({ sort_order: categories.length })}>
            <Plus className="h-4 w-4 mr-1" /> New category
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left hidden sm:table-cell">Slug</th>
                <th className="p-3 text-right">Sort</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{c.slug}</td>
                  <td className="p-3 text-right">{c.sort_order}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditingCat(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeCat(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No categories yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-extrabold">Product Groups</h2>
          <Button
            className="rounded-full"
            disabled={categories.length === 0}
            onClick={() => setEditingGroup({ sort_order: groups.length, category_id: categories[0]?.id })}
          >
            <Plus className="h-4 w-4 mr-1" /> New group
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Group</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Sort</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-t border-border">
                  <td className="p-3 font-medium">{g.name}</td>
                  <td className="p-3 text-muted-foreground">{categories.find((c) => c.id === g.category_id)?.title ?? "—"}</td>
                  <td className="p-3 text-right">{g.sort_order}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditingGroup(g)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeGroup(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No groups yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          {editingCat && (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={editingCat.title ?? ""} onChange={(e) => setEditingCat({ ...editingCat, title: e.target.value })} /></div>
              <div><Label>Slug (optional)</Label><Input placeholder="auto from title" value={editingCat.slug ?? ""} onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={editingCat.description ?? ""} onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={editingCat.sort_order ?? 0} onChange={(e) => setEditingCat({ ...editingCat, sort_order: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveCat}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingGroup} onOpenChange={(o) => !o && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup?.id ? "Edit group" : "New group"}</DialogTitle></DialogHeader>
          {editingGroup && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editingGroup.name ?? ""} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={editingGroup.category_id ?? ""} onValueChange={(v) => setEditingGroup({ ...editingGroup, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Sort order</Label><Input type="number" value={editingGroup.sort_order ?? 0} onChange={(e) => setEditingGroup({ ...editingGroup, sort_order: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveGroup}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
