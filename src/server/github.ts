/*
 * Sign in with GitHub (OAuth web flow). Optional: enabled when GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set.
 * An existing account is found by its GitHub id, then by a verified e-mail; otherwise a new account is created.
 */
import { randomBytes } from "node:crypto";
import { db, type Db } from "./db";
import { DomainError } from "./errors";

export type GithubConfig = { clientId: string; clientSecret: string; appUrl: string };

export function githubConfig(env: NodeJS.ProcessEnv = process.env): GithubConfig | null {
  const clientId = env.GITHUB_CLIENT_ID ?? "";
  const clientSecret = env.GITHUB_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, appUrl: (env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "") };
}

export const OAUTH_COOKIE = "kabad_oauth";
export const newState = () => randomBytes(24).toString("base64url");

export function authorizeUrl(config: GithubConfig, state: string) {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", config.clientId);
  u.searchParams.set("redirect_uri", `${config.appUrl}/api/auth/github/callback`);
  u.searchParams.set("scope", "read:user user:email");
  u.searchParams.set("state", state);
  u.searchParams.set("allow_signup", "true");
  return u.toString();
}

const failed = () => new DomainError("github", "La connexion avec GitHub a échoué. Réessayez.", 502);

type GithubUser = { id: number; login: string; name: string | null; html_url: string };
type GithubEmail = { email: string; verified: boolean; primary: boolean };

export async function fetchGithubIdentity(config: GithubConfig, code: string, fetchImpl: typeof fetch = fetch) {
  const tokenRes = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: `${config.appUrl}/api/auth/github/callback` }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const token = tokenRes?.ok ? ((await tokenRes.json()) as { access_token?: string }).access_token : undefined;
  if (!token) throw failed();
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "KABAD" };
  const [userRes, emailsRes] = await Promise.all([
    fetchImpl("https://api.github.com/user", { headers, signal: AbortSignal.timeout(10_000) }).catch(() => null),
    fetchImpl("https://api.github.com/user/emails", { headers, signal: AbortSignal.timeout(10_000) }).catch(() => null),
  ]);
  if (!userRes?.ok || !emailsRes?.ok) throw failed();
  const user = (await userRes.json()) as GithubUser;
  const emails = (await emailsRes.json()) as GithubEmail[];
  const email = (emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified))?.email;
  if (!email) throw new DomainError("github_email", "Votre compte GitHub n’a pas d’adresse e-mail vérifiée.", 400);
  return { githubId: user.id, login: user.login, name: user.name?.trim() || user.login, email: email.toLowerCase(), profile: `github.com/${user.login}` };
}

/** Returns the member to sign in, and whether the account was just created (to finish the profile). */
export async function signInWithGithub(identity: Awaited<ReturnType<typeof fetchGithubIdentity>>, prisma: Db = db) {
  const byGithub = await prisma.user.findUnique({ where: { githubId: identity.githubId } });
  if (byGithub) return { user: byGithub, created: false };
  // A verified GitHub e-mail proves the address: the existing account is linked.
  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
  if (byEmail) {
    const user = await prisma.user.update({ where: { id: byEmail.id }, data: { githubId: identity.githubId, githubLogin: identity.login, profileLink: byEmail.profileLink || identity.profile } });
    return { user, created: false };
  }
  const user = await prisma.user.create({ data: { email: identity.email, name: identity.name.slice(0, 80), githubId: identity.githubId, githubLogin: identity.login, profileLink: identity.profile } });
  return { user, created: true };
}
