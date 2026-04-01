"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createBrowserSupabaseClient } from "./supabase/browser";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

type Session = {
  user: SessionUser;
} | null;

type Status = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  session: Session;
  status: Status;
  refreshSession: () => Promise<Session>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Session;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refreshSession = useCallback(async () => {
    const nextSession = await fetchSession();
    setSession(nextSession);
    setStatus(nextSession ? "authenticated" : "unauthenticated");
    return nextSession;
  }, []);

  useEffect(() => {
    void refreshSession();

    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      status,
      refreshSession,
    }),
    [refreshSession, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return {
    data: context.session,
    status: context.status,
    update: context.refreshSession,
  };
}

export async function signIn(
  provider: string,
  options?: {
    email?: string;
    password?: string;
    redirect?: boolean;
  },
) {
  if (provider !== "credentials") {
    return { error: "Unsupported auth provider" };
  }

  const email = options?.email?.trim();
  const password = options?.password;
  if (!email || !password) {
    return { error: "Missing credentials" };
  }

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: undefined, ok: true, status: 200, url: null };
}

export async function signOut(options?: { redirect?: boolean }) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  if (options?.redirect !== false && typeof window !== "undefined") {
    window.location.assign("/");
  }
}
