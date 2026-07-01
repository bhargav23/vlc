import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Search, X } from "lucide-react";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminOrders,
});

const STATUSES = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"] as const;
type Status = typeof STATUSES[number];
const SLOTS = ["morning", "evening"] as const;
type Slot = typeof SLOTS[number];

const PAGE_SIZE = 25;

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-secondary text-secondary-foreground",
  confirmed: "bg-info/15 text-info",
  out_for_delivery: "bg-warning/20 text-warning-foreground",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const labelize = (s: string) => s.replace(/_/g, " ");

function AdminOrders() {
  const qc = useQueryClient();

  // Filters (local state — single source of truth for the query key)
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [slotFilter, setSlotFilter] = useState<"all" | Slot>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);

  // Selection (per-page)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [debouncedQ, statusFilter, slotFilter, from, to]);

  const filtersActive =
    debouncedQ !== "" || statusFilter !== "all" || slotFilter !== "all" || !!from || !!to;

  const ordersKey = ["admin", "orders", { q: debouncedQ, statusFilter, slotFilter, from: from?.toISOString() ?? null, to: to?.toISOString() ?? null, page }] as const;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ordersKey,
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(count)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (slotFilter !== "all") query = query.eq("slot", slotFilter);
      if (from) query = query.gte("created_at", from.toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }
      if (debouncedQ) {
        const safe = debouncedQ.replace(/[%,]/g, "");
        query = query.or(`customer_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
      }

      const { data, count, error } = await query;
      if (error) {
        logger.error("[admin.orders] list:", error);
        toast.error("Could not load orders.");
        return { rows: [], count: 0 };
      }
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const orders = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: items = [] } = useQuery({
    queryKey: ["admin", "order_items", openId],
    enabled: !!openId,
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", openId!);
      return data ?? [];
    },
  });

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ["admin", "orders"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      invalidateOrders();
    },
    onError: (e) => {
      logger.error("[admin.orders] update status:", e);
      toast.error("Could not update status. Please try again.");
    },
  });

  const updateSlot = useMutation({
    mutationFn: async ({ id, slot }: { id: string; slot: Slot }) => {
      const { error } = await supabase.from("orders").update({ slot }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot updated");
      invalidateOrders();
    },
    onError: (e) => {
      logger.error("[admin.orders] update slot:", e);
      toast.error("Could not update slot. Please try again.");
    },
  });

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Updated ${v.ids.length} order${v.ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      invalidateOrders();
    },
    onError: (e) => {
      logger.error("[admin.orders] bulk update:", e);
      toast.error("Could not update orders. Please try again.");
    },
  });

  const pageIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));

  const toggleAll = (checked: boolean) => {
    const next = new Set(selected);
    if (checked) pageIds.forEach((id) => next.add(id));
    else pageIds.forEach((id) => next.delete(id));
    setSelected(next);
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const clearFilters = () => {
    setQ("");
    setStatusFilter("all");
    setSlotFilter("all");
    setFrom(undefined);
    setTo(undefined);
  };

  const open = orders.find((o) => o.id === openId);
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min(total, page * PAGE_SIZE + orders.length);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${total} order${total === 1 ? "" : "s"}`}
            {isFetching && !isLoading ? " · refreshing…" : ""}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone…"
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{labelize(s)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={slotFilter} onValueChange={(v) => setSlotFilter(v as typeof slotFilter)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Slot" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All slots</SelectItem>
            {SLOTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <DateField label="From" value={from} onChange={setFrom} />
        <DateField label="To" value={to} onChange={setTo} />

        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2 mb-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select onValueChange={(v) => bulkUpdate.mutate({ ids: Array.from(selected), status: v as Status })}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Set status to…" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{labelize(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Cancel</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase">
            <tr>
              <th className="p-3 w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(c) => toggleAll(!!c)}
                  aria-label="Select all on page"
                />
              </th>
              <th className="p-3 text-left">When</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left hidden md:table-cell">Items</th>
              <th className="p-3 text-left hidden sm:table-cell">Slot</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td colSpan={7} className="p-3"><Skeleton className="h-6 w-full" /></td>
              </tr>
            ))}

            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-60" />
                  <p className="font-medium">No orders match these filters</p>
                  {filtersActive && (
                    <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">
                      Clear filters
                    </Button>
                  )}
                </td>
              </tr>
            )}

            {!isLoading && orders.map((o) => {
              const itemsCount = Array.isArray(o.order_items) && o.order_items[0]?.count ? o.order_items[0].count : 0;
              const isSel = selected.has(o.id);
              return (
                <tr
                  key={o.id}
                  className={cn(
                    "border-t border-border hover:bg-secondary/30 cursor-pointer",
                    isSel && "bg-primary/5",
                  )}
                  onClick={() => setOpenId(o.id)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={(c) => toggleOne(o.id, !!c)}
                      aria-label={`Select order ${o.id}`}
                    />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(o.created_at), "dd MMM, HH:mm")}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{itemsCount}</td>
                  <td className="p-3 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                    <Select value={o.slot} onValueChange={(v) => updateSlot.mutate({ id: o.id, slot: v as Slot })}>
                      <SelectTrigger className="h-8 w-28 text-xs capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SLOTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">Rs {Number(o.total)}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v as Status })}>
                      <SelectTrigger
                        className={cn(
                          "h-8 text-xs capitalize border-transparent font-medium",
                          STATUS_STYLES[o.status as Status],
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{labelize(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Order details</SheetTitle></SheetHeader>
          {open && (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-base">{open.customer_name}</p>
                <p className="text-muted-foreground">{open.phone}</p>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-1">
                <p className="text-xs uppercase text-muted-foreground font-medium">Delivery</p>
                <p>{open.address}, {open.city} - {open.pincode}</p>
                {open.landmark && <p className="text-muted-foreground">Landmark: {open.landmark}</p>}
                <p>Slot: <span className="capitalize font-medium">{open.slot}</span></p>
              </div>

              <div className="rounded-xl border border-border p-3">
                <h3 className="font-semibold mb-2">Items</h3>
                <ul className="space-y-1">
                  {items.map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span>{i.qty}× {i.name_snapshot}</span>
                      <span>Rs {Number(i.price_snapshot) * i.qty}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>Rs {Number(open.subtotal)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>Rs {Number(open.delivery_fee)}</span></div>
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span>Rs {Number(open.total)}</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-xs uppercase text-muted-foreground font-medium mb-2">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={open.status === s ? "default" : "outline"}
                      onClick={() => updateStatus.mutate({ id: open.id, status: s })}
                      className="capitalize"
                    >
                      {labelize(s)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          {value ? format(value, "dd MMM yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
        {value && (
          <div className="border-t border-border p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(undefined)}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
