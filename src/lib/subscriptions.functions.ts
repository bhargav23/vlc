import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreditInput = z.object({
  email: z.string().trim().email().max(200),
  tier_id: z.string().uuid(),
});

export const creditSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreditInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify caller is admin without exposing the has_role SECURITY DEFINER RPC to clients.
    const { data: roleRow, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !roleRow) throw new Error("Not authorized.");

    // Look up user by email via admin API (paginated; small projects).
    const email = data.email.toLowerCase();
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) {
        console.error("[creditSubscription] listUsers:", error);
        throw new Error("Could not look up user.");
      }
      const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (match) userId = match.id;
      if (list.users.length < 200) break;
    }
    if (!userId) throw new Error("No user found with that email. Ask them to sign up first.");

    const { data: tier, error: tierErr } = await supabaseAdmin
      .from("subscription_tiers")
      .select("id, name, credit_value, active")
      .eq("id", data.tier_id)
      .single();
    if (tierErr || !tier || !tier.active) throw new Error("Tier unavailable.");

    const { data: row, error: insErr } = await supabaseAdmin
      .from("user_subscriptions")
      .insert({ user_id: userId, tier_id: tier.id, balance: tier.credit_value })
      .select("id")
      .single();
    if (insErr || !row) {
      console.error("[creditSubscription] insert:", insErr);
      throw new Error("Could not credit subscription.");
    }

    return { id: row.id, user_id: userId, tier_name: tier.name, balance: Number(tier.credit_value) };
  });
