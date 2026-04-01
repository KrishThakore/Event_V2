import { getSession } from "./auth";

export type DefaultSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
};

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type NextAuthOptions = Record<string, never>;

export async function getServerSession(_options?: unknown) {
  return getSession();
}
