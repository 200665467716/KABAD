import { NextResponse, type NextRequest } from "next/server";
import { salonsEnabled } from "@/lib/features";

/*
 * Optimistic check only: sends visitors without a session cookie to the sign-in page.
 * The real check happens on the server for every read and write (src/server/auth.ts).
 * Voice rooms switched off: their API answers 404 (the screens call notFound() in their layout).
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/rooms")) {
    // API routes check the session themselves: only the switch is enforced here.
    if (salonsEnabled) return NextResponse.next();
    return NextResponse.json({ error: "Les salons vocaux sont désactivés.", code: "not_found" }, { status: 404 });
  }
  if (request.cookies.has("kabad_session")) return NextResponse.next();
  const url = new URL("/connexion", request.url);
  url.searchParams.set("suite", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Every screen of the signed-in app. Public: the welcome page, sign-up step 1, sign-in, sponsor pages.
  matcher: [
    "/accueil",
    "/membres",
    "/compte",
    "/salons/:path*",
    "/notifications",
    "/admin/:path*",
    "/profil/:path*",
    "/mentorat/:path*",
    "/capsules/:path*",
    "/defis/:path*",
    "/tests/:path*",
    "/messages/:path*",
    "/inscription/profil",
    "/inscription/recommandations",
    "/api/rooms/:path*",
  ],
};
