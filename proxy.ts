import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic guard for staff pages: no session cookie -> login page, without
 * rendering anything. It only checks that a cookie exists; the real check
 * (valid, not expired, not deactivated) happens on the server in the
 * dashboard layout and in every API handler (server/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/connexion", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/tableau-de-bord/:path*", "/impression/:path*"],
};
