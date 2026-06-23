import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [{ data: orders }, { count: pending }, { count: total }] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at").gte("created_at", since),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
      ]);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todays = (orders ?? []).filter((o) => new Date(o.created_at) >= today);
      const revToday = todays.reduce((s, o) => s + Number(o.total), 0);
      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(5, 10), 0);
      }
      for (const o of orders ?? []) {
        const k = new Date(o.created_at).toISOString().slice(5, 10);
        if (byDay.has(k)) byDay.set(k, byDay.get(k)! + Number(o.total));
      }
      return {
        revToday, ordersToday: todays.length,
        pending: pending ?? 0, total: total ?? 0,
        chart: Array.from(byDay, ([day, revenue]) => ({ day, revenue })),
      };
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Revenue today" value={`Rs ${data?.revToday ?? 0}`} />
        <Kpi label="Orders today" value={data?.ordersToday ?? 0} />
        <Kpi label="Pending orders" value={data?.pending ?? 0} />
        <Kpi label="Total orders" value={data?.total ?? 0} />
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold mb-4">Last 7 days revenue</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chart ?? []}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
