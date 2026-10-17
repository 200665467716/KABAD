"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { formatDuration } from "@/lib/format";
import { REQUIRED_MENTORING_MINUTES } from "@/lib/mentoring";
import { usePairSessions } from "@/lib/use-pair";

export function EligibilityAlert() {
  const { eligibility: e } = usePairSessions();
  return (
    <div aria-live="polite">
      {e.eligible ? (
        <Alert tone="success" title="Vous pouvez participer.">
          {formatDuration(e.confirmed)} de mentorat attestées par Awa Diop.
        </Alert>
      ) : (
        <Alert tone="reward" title={`Encore ${formatDuration(e.missing)} de mentorat.`}>
          Ce défi à cagnotte demande {formatDuration(REQUIRED_MENTORING_MINUTES)} attestées par un mentor KABAD.
        </Alert>
      )}
    </div>
  );
}

export function ParticipateButton({ challengeId, requiresMentoring }: { challengeId: string; requiresMentoring: boolean }) {
  const { eligibility } = usePairSessions();
  if (requiresMentoring && !eligibility.eligible) {
    return (
      <ButtonLink href="/mentorat" size="lg" block>
        Confirmer mes séances de mentorat
      </ButtonLink>
    );
  }
  return (
    <ButtonLink href={`/defis/${challengeId}/soumettre`} size="lg" block>
      Participer au défi
    </ButtonLink>
  );
}
