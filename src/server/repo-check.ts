/*
 * Checks that a submitted repository is public, so the jury can read it (H5e).
 * Only the three forges accepted by the form are called, and redirections are never followed:
 * the server cannot be made to fetch an address chosen by a member.
 */
import { REPO_URL, repoIsPublic } from "@/lib/repo";

export type RepoCheck = (url: string) => Promise<boolean | null>;

export const isPublicRepo: RepoCheck = async (url) => {
  if (!REPO_URL.test(url)) return false;
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "KABAD", Accept: "text/html" } });
    // The page itself is not read.
    await res.body?.cancel().catch(() => {});
    return repoIsPublic(res.status, res.headers.get("location"));
  } catch {
    // No network, or the forge is too slow: nothing can be said.
    return null;
  }
};
