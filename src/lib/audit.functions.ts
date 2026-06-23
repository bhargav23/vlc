import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit, resolveUserFromBearer } from "./audit.server";
import { enforceRateLimit } from "./rate-limit.server";

const WhatsAppIntentInput = z.object({
  source: z.enum(["checkout", "fab"]),
  item_count: z.number().int().min(0).max(200),
  total: z.number().min(0).max(1_000_000),
  customer_name: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
});

export const logWhatsAppOrderIntent = createServerFn({ method: "POST" })
  .inputValidator((input) => WhatsAppIntentInput.parse(input))
  .handler(async ({ data }) => {
    const limits = [
      enforceRateLimit({
        scope: `whatsapp-intent:${data.source}:request`,
        maxRequests: 20,
        windowSeconds: 15 * 60,
      }),
    ];

    if (data.phone) {
      limits.push(
        enforceRateLimit({
          scope: "whatsapp-intent:phone",
          identifier: data.phone,
          maxRequests: 10,
          windowSeconds: 60 * 60,
        }),
      );
    }

    await Promise.all(limits);

    const { id, email } = await resolveUserFromBearer();
    await writeAudit("order.whatsapp_intent", {
      user_id: id,
      actor_email: email,
      metadata: {
        source: data.source,
        item_count: data.item_count,
        total: data.total,
        customer_name: data.customer_name ?? null,
        phone: data.phone ?? null,
      },
    });
    return { ok: true as const };
  });

export const recordAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ path: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    // Server-side re-verification of admin role.
    const { data: roleRow, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) {
      console.error("[recordAdminAccess] role lookup failed", error);
      throw new Error("Role check failed");
    }
    const granted = !!roleRow;
    const email = (claims as { email?: string } | null)?.email ?? null;
    await writeAudit("admin.access", {
      user_id: userId,
      actor_email: email,
      metadata: { path: data.path, granted },
    });
    return { granted };
  });
