import { getRequestHeader } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type RateLimitOptions = {
  scope: string;
  maxRequests: number;
  windowSeconds: number;
  identifier?: string;
  message?: string;
};

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: RateLimitRow[] | null; error: { message?: string } | null }>;
};

function firstHeaderValue(value: string | undefined) {
  return value?.split(",")[0]?.trim() || undefined;
}

export function getClientRequestFingerprint() {
  const ip =
    firstHeaderValue(getRequestHeader("x-nf-client-connection-ip")) ??
    firstHeaderValue(getRequestHeader("cf-connecting-ip")) ??
    firstHeaderValue(getRequestHeader("x-real-ip")) ??
    firstHeaderValue(getRequestHeader("x-forwarded-for")) ??
    "unknown-ip";

  const userAgent = getRequestHeader("user-agent")?.slice(0, 200) ?? "unknown-agent";
  return `${ip}|${userAgent}`;
}

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex");
}

export async function enforceRateLimit({
  scope,
  maxRequests,
  windowSeconds,
  identifier = getClientRequestFingerprint(),
  message = "Too many requests. Please try again later.",
}: RateLimitOptions) {
  const { data, error } = await (supabaseAdmin as unknown as RpcClient).rpc("check_server_rate_limit", {
    _scope: scope,
    _identifier_hash: hashIdentifier(identifier),
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] check failed", { scope, error });
    throw new Error("Could not verify request limits. Please try again.");
  }

  const result = data?.[0];
  if (!result?.allowed) {
    throw new Error(message);
  }

  return result;
}
