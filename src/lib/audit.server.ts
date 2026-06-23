import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequestHeader } from "@tanstack/react-start/server";

export type AuditEvent =
  | "order.placed"
  | "order.whatsapp_intent"
  | "admin.access";

export async function writeAudit(
  event_type: AuditEvent,
  opts: {
    user_id?: string | null;
    actor_email?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const ip =
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const user_agent = getRequestHeader("user-agent") ?? null;

  const { error } = await supabaseAdmin.from("audit_logs").insert({
    event_type,
    user_id: opts.user_id ?? null,
    actor_email: opts.actor_email ?? null,
    ip,
    user_agent,
    metadata: (opts.metadata ?? {}) as never,
  });
  if (error) {
    // Never fail the calling flow because of audit issues.
    console.error("[audit] insert failed", event_type, error);
  }
}

export async function resolveUserFromBearer(): Promise<{
  id: string | null;
  email: string | null;
}> {
  const authHeader = getRequestHeader("authorization");
  if (!authHeader?.startsWith("Bearer ")) return { id: null, email: null };
  const token = authHeader.slice("Bearer ".length);
  const { data } = await supabaseAdmin.auth.getUser(token);
  return { id: data.user?.id ?? null, email: data.user?.email ?? null };
}
