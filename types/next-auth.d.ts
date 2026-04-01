declare module 'next-auth' {
  export interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
    };
  }

  export interface DefaultSession extends Session {}

  export type NextAuthOptions = Record<string, never>;

  export function getServerSession(options?: unknown): Promise<Session | null>;
}

declare module 'next-auth/react' {
  import type { ReactNode } from 'react';
  import type { Session } from 'next-auth';

  export function SessionProvider(props: { children: ReactNode }): JSX.Element;
  export function useSession(): {
    data: Session | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    update: () => Promise<Session | null>;
  };
  export function signIn(
    provider: string,
    options?: { email?: string; password?: string; redirect?: boolean }
  ): Promise<{ error?: string; ok?: boolean; status?: number; url?: string | null }>;
  export function signOut(options?: { redirect?: boolean }): Promise<void>;
}
