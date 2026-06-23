import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AuditPage,
});

type Row = {
  id: string;
  event_type: string;
  user_id: string | null;
  actor_email: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const EVENTS = ["all", "order.placed", "order.whatsapp_intent", "admin.access"] as const;

function AuditPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof EVENTS)[number]>("all");

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("event_type", filter);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, filter]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Audit log</h1>
          <p className="text-sm text-muted-foreground">Last 200 events. Newest first.</p>
        </div>
        <div className="flex gap-2">
          {EVENTS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setFilter(e)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === e
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-semibold">{r.event_type}</td>
                  <td className="px-3 py-2">
                    <div>{r.actor_email ?? <span className="text-muted-foreground">guest</span>}</div>
                    {r.user_id && (
                      <div className="text-[11px] text-muted-foreground font-mono">{r.user_id.slice(0, 8)}…</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.ip ?? "—"}</td>
                  <td className="px-3 py-2">
                    <pre className="max-w-md whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                      {JSON.stringify(r.metadata, null, 0)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
