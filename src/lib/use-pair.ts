"use client";

import { pair } from "./data";
import { useDemoList } from "./demo-store";
import { cashChallengeEligibility } from "./mentoring";

/** The pair's sessions, including confirmations made in this browser. */
export function usePairSessions() {
  const [confirmed, confirm] = useDemoList("confirmed-sessions");
  const sessions = pair.sessions.map((s) => (confirmed.includes(s.id) ? { ...s, confirmedByMentee: true } : s));
  return { sessions, eligibility: cashChallengeEligibility(sessions), confirm };
}
