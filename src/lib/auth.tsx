import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  roleError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  const roleRequestId = useRef(0);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    const resolveAdminRole = async (userId: string, requestId: number) => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (requestId !== roleRequestId.current) return;

      if (error) {
        console.error("Failed to load admin role", error);
        setIsAdmin(false);
        setRoleError(error.message);
      } else {
        setIsAdmin(!!data);
        setRoleError(null);
      }

      setRoleLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const requestId = ++roleRequestId.current;

      if (s?.user) {
        setRoleLoading(true);
        setRoleError(null);
        setIsAdmin(false);
        // Defer Supabase queries to avoid deadlock inside the listener.
        setTimeout(() => {
          void resolveAdminRole(s.user.id, requestId);
        }, 0);
      } else {
        setIsAdmin(false);
        setRoleError(null);
        setRoleLoading(false);
      }

      router.invalidate();
      qc.invalidateQueries();
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const requestId = ++roleRequestId.current;

      if (data.session?.user) {
        setRoleLoading(true);
        setRoleError(null);
        setIsAdmin(false);
        void resolveAdminRole(data.session.user.id, requestId);
      } else {
        setIsAdmin(false);
        setRoleError(null);
        setRoleLoading(false);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router, qc]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isAdmin,
    loading,
    roleLoading,
    roleError,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
