import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { salonsEnabled } from "@/lib/features";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

/** Screens of the signed-in app. Public: the welcome page, sign-up step 1, sign-in, sponsor pages. */
const privatePaths = [
  /^\/(accueil|membres|compte|notifications)$/,
  /^\/(salons|admin|profil|mentorat|capsules|hackathons|rise-up|tests|messages)(\/.*)?$/,
  /^\/inscription\/(profil|interets|recommandations)$/,
];

/*
 * 1. Languages: French addresses have no prefix, English ones start with /en (next-intl).
 * 2. Optimistic check only: sends visitors without a session cookie to the sign-in page.
 *    The real check happens on the server for every read and write (src/server/auth.ts).
 * Voice rooms switched off: their API answers 404 (the screens call notFound() in their layout).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/rooms")) {
    // API routes check the session themselves: only the switch is enforced here.
    if (salonsEnabled) return NextResponse.next();
    return NextResponse.json({ error: "Les salons vocaux sont désactivés.", code: "not_found" }, { status: 404 });
  }
  const english = /^\/en(\/|$)/.test(pathname);
  const path = english ? pathname.slice(3) || "/" : pathname;
  if (!request.cookies.has("kabad_session") && privatePaths.some((re) => re.test(path))) {
    const url = new URL(english ? "/en/connexion" : "/connexion", request.url);
    // Always without the language: the sign-in form adds it back.
    url.searchParams.set("suite", path);
    return NextResponse.redirect(url);
  }
  return intl(request);
}

export const config = {
  // Every page, except the API (bar the voice rooms switch), Next.js internals and files such as /icon.svg.
  matcher: ["/api/rooms/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
