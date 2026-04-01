import { prisma } from "./prisma";
import { createRouteHandlerSupabaseClient, createServerComponentSupabaseClient } from "./supabase/server";

export const authOptions = {};

export type AppSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

export type AppSession = {
  user: AppSessionUser;
};

async function buildSessionFromUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      disabled: true,
      phone_number: true,
      university: true,
    },
  });

  if (profile?.disabled) {
    return null;
  }

  const email = profile?.email ?? user.email ?? null;
  if (!email) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email,
      name: profile?.full_name ?? (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null),
      role: profile?.role ?? "student",
    },
  } satisfies AppSession;
}

export async function getSession() {
  const supabase = createServerComponentSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return buildSessionFromUser(user);
}

export async function getRouteSession() {
  const supabase = createRouteHandlerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return buildSessionFromUser(user);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      disabled: true,
      phone_number: true,
      university: true,
    },
  });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return session;
}

export async function requireRole(role: string | string[]) {
  const session = await requireAuth();
  const userRole = session.user.role;

  const hasRole = Array.isArray(role)
    ? role.includes(userRole)
    : userRole === role;

  if (!hasRole) {
    throw new Error("Not authorized");
  }

  return session.user;
}
