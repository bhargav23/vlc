import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Confirming — Velocity Kitchen" }, { name: "robots", content: "noindex" }] }),
  component: AuthCallbackPage,
});

type OtpType = "signup" | "recovery" | "email_change" | "invite" | "magiclink";

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        // Some providers put params in the hash fragment.
        const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);

        const tokenHash = params.get("token_hash") ?? hashParams.get("token_hash");
        const type = (params.get("type") ?? hashParams.get("type")) as OtpType | null;
        const code = params.get("code") ?? hashParams.get("code");
        const errorDescription = params.get("error_description") ?? hashParams.get("error_description");

        if (errorDescription) throw new Error(errorDescription);

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Fallback: maybe detectSessionInUrl already handled hash tokens.
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Missing confirmation token in URL.");
        }

        if (cancelled) return;
        setStatus("ok");
        setMessage("Email confirmed — you can sign in now.");
        toast.success("Email confirmed");
        setTimeout(() => navigate({ to: "/login" }), 800);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Confirmation failed.";
        setStatus("error");
        setMessage(msg);
        toast.error(msg);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center">
        <h1 className="text-2xl font-extrabold">
          {status === "working" ? "Confirming…" : status === "ok" ? "All set" : "Confirmation failed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {status === "error" && (
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/signup" className="text-primary font-semibold">Try signing up again</Link>
            <Link to="/login" className="text-muted-foreground text-sm">Back to sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
