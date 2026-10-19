import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { formatDuration } from "@/lib/format";
import { REQUIRED_MENTORING_MINUTES } from "@/lib/mentoring";
import type { Eligibility } from "@/lib/domain-types";

const names = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`);

export function EligibilityAlert({ eligibility: e }: { eligibility: Eligibility }) {
  return e.eligible ? (
    <Alert tone="success" title="Vous pouvez participer.">
      {formatDuration(e.confirmed)} de mentorat attestées{e.mentors.length ? ` par ${names(e.mentors)}` : ""}.
    </Alert>
  ) : (
    <Alert tone="reward" title={`Encore ${formatDuration(e.missing)} de mentorat.`}>
      Ce défi à cagnotte demande {formatDuration(REQUIRED_MENTORING_MINUTES)} attestées par un mentor KABAD.
    </Alert>
  );
}

export function ParticipateButton({ challengeId, requiresMentoring, eligibility, submitted }: { challengeId: string; requiresMentoring: boolean; eligibility: Eligibility; submitted: boolean }) {
  if (requiresMentoring && !eligibility.eligible) {
    return (
      <ButtonLink href="/mentorat" size="lg" block>
        Confirmer mes séances de mentorat
      </ButtonLink>
    );
  }
  return (
    <ButtonLink href={`/defis/${challengeId}/soumettre`} size="lg" block>
      {submitted ? "Modifier ma solution" : "Participer au défi"}
    </ButtonLink>
  );
}
