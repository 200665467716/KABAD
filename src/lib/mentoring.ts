/**
 * Mentoring has no imposed rhythm. A session counts only once both members of the pair confirm it.
 * Cash-prize challenges require a minimum of confirmed mentoring time, attested by a KABAD mentor.
 */
export const REQUIRED_MENTORING_MINUTES = 6 * 60;

export type SessionConfirmation = {
  minutes: number;
  confirmedByMentor: boolean;
  confirmedByMentee: boolean;
};

export function isSessionCounted(session: SessionConfirmation): boolean {
  return session.minutes > 0 && session.confirmedByMentor && session.confirmedByMentee;
}

export function confirmedMinutes(sessions: SessionConfirmation[]): number {
  return sessions.filter(isSessionCounted).reduce((sum, s) => sum + s.minutes, 0);
}

export type Eligibility = { eligible: boolean; confirmed: number; missing: number; progress: number };

export function cashChallengeEligibility(
  sessions: SessionConfirmation[],
  required: number = REQUIRED_MENTORING_MINUTES,
): Eligibility {
  const confirmed = confirmedMinutes(sessions);
  const missing = Math.max(0, required - confirmed);
  return { eligible: missing === 0, confirmed, missing, progress: required === 0 ? 1 : Math.min(1, confirmed / required) };
}
