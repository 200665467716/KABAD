import { cookies } from "next/headers";
import { connection } from "next/server";
import { authorizeUrl, githubConfig, newState, OAUTH_COOKIE } from "@/server/github";

/** Starts the GitHub sign-in. The state cookie ties the callback to this browser. */
export async function GET(request: Request) {
  await connection();
  const config = githubConfig();
  const url = new URL(request.url);
  if (!config) return Response.redirect(new URL("/connexion?erreur=github", url), 303);
  const next = url.searchParams.get("suite") ?? "/accueil";
  const state = newState();
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, next }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/github", maxAge: 600 });
  return Response.redirect(authorizeUrl(config, state), 303);
}
