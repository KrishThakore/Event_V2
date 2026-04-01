import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./config";

function createCookieAdapter() {
  const cookieStore = cookies();

  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set({ name, value, ...(options as object) });
        }
      } catch {
        // Server components can read but not mutate cookies.
      }
    },
  };
}

export function createServerComponentSupabaseClient() {
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: createCookieAdapter(),
  });
}

export function createRouteHandlerSupabaseClient() {
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: createCookieAdapter(),
  });
}
