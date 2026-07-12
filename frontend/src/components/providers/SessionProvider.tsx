/**
 * Session Provider Component
 * Wraps the app with NextAuth SessionProvider
 */

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Refetch the session every 5 minutes (and on window focus) so the backend
  // access token — which lives 15 minutes and is refreshed inside the jwt
  // callback — stays fresh even in a long-lived tab (e.g. a user filling in the
  // checkout or booking form), instead of going stale and 401-ing on submit.
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      {children}
    </NextAuthSessionProvider>
  );
}
