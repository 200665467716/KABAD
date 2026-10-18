import { NextResponse, type NextRequest } from "next/server";

/*
 * Optimistic check only: sends visitors without a session cookie to the sign-in page.
 * The real check happens on the server for every read and write (src/server/auth.ts).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("kabad_session")) return NextResponse.next();
  const url = new URL("/connexion", request.url);
  url.searchParams.set("suite", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/messages/:path*"],
};
