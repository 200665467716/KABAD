import { cookies } from "next/headers";
import { connection } from "next/server";
import { createSession, setSessionCookie } from "@/server/auth";
import { fetchGithubIdentity, githubConfig, OAUTH_COOKIE, signInWithGithub } from "@/server/github";
import { safeNext } from "@/lib/safe-next";


export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const config = githubConfig();
  const store = await cookies();
  const saved = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: "/api/auth/github" });
  const base = config?.appUrl ?? url.origin;
  const fail = () => Response.redirect(new URL("/connexion?erreur=github", base), 303);
  if (!config || !saved) return fail();
  let expected: { state?: string; next?: string };
  try {
    expected = JSON.parse(saved);
  } catch {
    return fail();
  }
  const code = url.searchParams.get("code");
  if (!code || !expected.state || url.searchParams.get("state") !== expected.state) return fail();
  try {
    const identity = await fetchGithubIdentity(config, code);
    const { user, created } = await signInWithGithub(identity);
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    return Response.redirect(new URL(created ? "/inscription/profil" : safeNext(expected.next), base), 303);
  } catch (e) {
    console.error("Connexion GitHub", e);
    return fail();
  }
}
