"use client";

import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Client-side auth hook exposing the Supabase-backed session shim.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user;
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const signOut = async () => {
    await nextAuthSignOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut,
  };
}
