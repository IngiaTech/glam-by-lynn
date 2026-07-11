/**
 * Next.js middleware — server-side route protection.
 *
 * Guards every /admin/* route by requiring a NextAuth session whose backend
 * JWT is flagged `isAdmin`. This runs at the edge before any admin page or its
 * JS bundle is served, so non-admins never receive admin code or data — a
 * defense-in-depth layer on top of the backend's per-request Bearer checks.
 */
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => token?.isAdmin === true,
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
