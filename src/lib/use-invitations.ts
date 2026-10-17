"use client";

import { invitations } from "./data";
import { useDemoList } from "./demo-store";

/** Invitations still waiting for an answer, after accept or decline in this browser. */
export function useInvitations() {
  const [accepted, accept] = useDemoList("accepted-invitations");
  const [declined, decline] = useDemoList("declined-invitations");
  const pending = invitations.filter((i) => !accepted.includes(i.id) && !declined.includes(i.id));
  return { pending, accepted, accept, decline };
}
