/*
 * The link to a team's repository (screens H5 and H5e).
 * The member may type "github.com/equipe/projet": "https://" is added, ".git" and the last "/" are dropped.
 */
export const REPO_URL = /^https:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[\w.-]+\/[\w.-]+$/;

export function normalizeRepoUrl(input: string): string {
  const typed = input.trim().replace(/^http:\/\//i, "https://");
  const withScheme = /^https:\/\//i.test(typed) || typed === "" ? typed : `https://${typed}`;
  return withScheme
    .replace(/^https:\/\/www\./i, "https://")
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "");
}

/**
 * What the forge's answer says about the repository: true when anyone can open it, false when it does not
 * exist or is private (404, or a redirection to the sign-in page), null when the answer tells nothing
 * (forge down, too many requests): the link is then accepted rather than blocking a team at the deadline.
 */
export function repoIsPublic(status: number, location: string | null): boolean | null {
  if (status === 200) return true;
  if (status === 404 || status === 401 || status === 403) return false;
  // A renamed repository moves (301) and stays public; a private one sends to the sign-in page.
  if (status >= 300 && status < 400) return location !== null && !/sign_in|login/i.test(location);
  return null;
}
