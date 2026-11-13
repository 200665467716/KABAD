"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Overline } from "@/components/ui/Display";
import { ToggleChip } from "@/components/ui/Controls";
import { Checkbox, Select, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { MentorCard } from "@/lib/domain-types";
import { initials } from "@/lib/format";
import { checkStep1, checkStep2, HACKATHON_LEVELS as LEVELS, type OrganizeError } from "@/lib/hackathon-form";
import { MAX_PRIZES } from "@/lib/prize";

type Format = "ONLINE" | "ONSITE" | "HYBRID";
const SIZES = { solo: [1, 1], soloOrTeam: [1, 5], range25: [2, 5], range34: [3, 4] } as const;

/** "2026-11-14T08:00" from the field, sent as an ISO date with the browser's offset. */
const iso = (local: string) => (local ? new Date(local).toISOString() : "");

/**
 * Organizing a hackathon in 3 steps: the event (H6), the challenge and the prizes (H7), then the
 * instructors (H8). Nothing is sent before the last step; the KABAD team then reviews and publishes.
 */
export function OrganizeForm({ defaultOrganizer, mentors }: { defaultOrganizer: string; mentors: MentorCard[] }) {
  const t = useTranslations("hackathons.organize");
  const tf = useTranslations("hackathons.format");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState({
    title: "",
    organizerName: defaultOrganizer,
    format: "HYBRID" as Format,
    city: "",
    startsAt: "",
    endsAt: "",
    closesAt: "",
    size: "range25" as keyof typeof SIZES,
    level: LEVELS[0] as string,
    stack: "",
    description: "",
    prizes: ["", ""] as string[],
    noPrize: false,
    rulesUrl: "",
    missionText: "",
    instructorFee: "",
    instructorCount: "2",
  });
  // H8: the mentors the mission will be offered to.
  const [proposed, setProposed] = useState<string[]>([]);
  // Errors written under their field, all at once; `error` is the one the server gives for the rest.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  // The field to focus once its step is on screen: the first one in error. A new object each time, so that the same field gets the focus again.
  const [focus, setFocus] = useState<{ field: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    // A field the member corrects loses its message.
    setErrors((e) => (k in e ? Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)) : e));
  };
  const err = (k: string) => errors[k];
  const step1Fields = ["title", "organizerName", "city", "startsAt", "endsAt", "closesAt", "teamMin", "stack"];
  const step2Fields = ["description", "prizes", "rulesUrl"];
  // These errors are written under their field; the others in a banner.
  const shownUnderField = ["title", "organizerName", "city", "startsAt", "endsAt", "closesAt", "stack", "description", "rulesUrl", "instructorFee"];
  const fee = Number(f.instructorFee) > 0;

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(focus.field === "prizes" ? "prize-0" : focus.field);
    el?.focus({ preventScroll: true });
    // Centered, so that the bar at the bottom does not hide the field and its message.
    el?.scrollIntoView({ block: "center" });
  }, [focus]);

  /** Checks a step and moves on only if nothing is wrong; otherwise every error shows and the first field gets the focus. */
  function next(found: Record<string, OrganizeError>, to: 2 | 3) {
    const text = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, t(`errors.${v}`)]));
    setErrors(text);
    setError(null);
    const first = Object.keys(found)[0];
    if (first) setFocus({ field: first });
    else setStep(to);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setErrors({});
    const [teamMin, teamMax] = SIZES[f.size];
    try {
      const { id } = await api<{ id: string }>("/api/hackathons", {
        body: {
          title: f.title,
          organizerName: f.organizerName,
          format: f.format,
          city: f.format === "ONLINE" ? undefined : f.city,
          startsAt: iso(f.startsAt),
          endsAt: iso(f.endsAt),
          closesAt: iso(f.closesAt),
          teamMin,
          teamMax,
          level: f.level,
          stack: f.stack,
          description: f.description,
          rulesUrl: f.rulesUrl,
          // Empty lines are dropped: no prize at all is allowed.
          prizes: f.noPrize ? [] : f.prizes.map((p) => p.trim()).filter(Boolean),
          missionText: f.missionText || undefined,
          instructorFee: f.instructorFee ? Number(f.instructorFee) : undefined,
          instructorCount: f.instructorFee ? Number(f.instructorCount || 0) : 0,
          mentorIds: fee ? proposed : [],
        },
      });
      router.push(`/hackathons/${id}`);
    } catch (x) {
      const field = x instanceof ApiError ? x.field : undefined;
      const text = x instanceof ApiError ? x.message : t("failed");
      if (field && shownUnderField.includes(field)) setErrors({ [field]: text });
      else setError(text);
      if (field && step1Fields.includes(field)) setStep(1);
      else if (field && step2Fields.includes(field)) setStep(2);
      if (field) setFocus({ field });
      setBusy(false);
    }
  }

  const footer =
    step === 1 ? (
      <Button size="lg" block onClick={() => next(checkStep1(f), 2)}>
        {t("continue")}
      </Button>
    ) : step === 2 ? (
      <>
        <Button size="lg" block onClick={() => next(checkStep2(f), 3)}>
          {t("continue")}
        </Button>
        <Button variant="ghost" onClick={() => setStep(1)}>
          {t("back")}
        </Button>
      </>
    ) : (
      <>
        <Button size="lg" block onClick={submit} disabled={busy}>
          {busy ? t("sending") : t("send")}
        </Button>
        <Button variant="ghost" onClick={() => setStep(2)} disabled={busy}>
          {t("back")}
        </Button>
      </>
    );

  return (
    <AuthFrame back="/hackathons" heading={t("heading")} step={step} steps={3} title={step === 1 ? t("step1") : step === 2 ? t("step2") : t("step3")} lead={step === 1 ? t("lead1") : step === 2 ? t("lead2") : t("lead3")} footer={footer}>
      {step === 1 ? (
        <div className="grid gap-4">
          <TextField id="title" label={t("title")} value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} error={err("title")} />
          <TextField id="organizerName" label={t("organizer")} value={f.organizerName} maxLength={80} onChange={(e) => set("organizerName", e.target.value)} error={err("organizerName")} />
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-extrabold">{t("format")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["ONLINE", "ONSITE", "HYBRID"] as const).map((x) => (
                <ToggleChip key={x} pressed={f.format === x} onClick={() => set("format", x)}>
                  {tf(x)}
                </ToggleChip>
              ))}
            </div>
          </fieldset>
          {f.format !== "ONLINE" && <TextField id="city" label={t("city")} value={f.city} maxLength={60} onChange={(e) => set("city", e.target.value)} error={err("city")} />}
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <TextField id="startsAt" type="datetime-local" label={t("start")} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} error={err("startsAt")} />
            <TextField id="endsAt" type="datetime-local" label={t("end")} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={err("endsAt")} />
          </div>
          <TextField id="closesAt" type="datetime-local" label={t("closes")} hint={t("closesHint")} value={f.closesAt} onChange={(e) => set("closesAt", e.target.value)} error={err("closesAt")} />
          <Select id="size" label={t("size")} value={f.size} onChange={(e) => set("size", e.target.value as keyof typeof SIZES)}>
            {(Object.keys(SIZES) as Array<keyof typeof SIZES>).map((k) => (
              <option key={k} value={k}>
                {t(`sizes.${k}`)}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select id="level" label={t("level")} value={f.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((l, i) => (
                <option key={l} value={l}>
                  {t(`levels.${i as 0 | 1 | 2 | 3}`)}
                </option>
              ))}
            </Select>
            <TextField id="stack" label={t("stack")} placeholder={t("stackPlaceholder")} value={f.stack} maxLength={60} onChange={(e) => set("stack", e.target.value)} error={err("stack")} />
          </div>
        </div>
      ) : step === 2 ? (
        <div className="grid gap-4">
          <TextArea id="description" label={t("challenge")} rows={4} value={f.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} error={err("description")} />
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-extrabold">{t("prizes")}</legend>
            <p className="mb-1 text-[13px] text-muted">{t("prizesHint")}</p>
            {!f.noPrize &&
              f.prizes.map((p, i) => (
                <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-ink font-display text-sm font-extrabold text-accent">{i + 1}</span>
                  <TextField id={`prize-${i}`} label={t("prizeLabel", { rank: i + 1 })} className="[&>label]:sr-only" placeholder={i === 0 ? t("prizePlaceholder") : t("prizeLabel", { rank: i + 1 })} value={p} maxLength={120} onChange={(e) => set("prizes", f.prizes.map((x, j) => (j === i ? e.target.value : x)))} />
                </div>
              ))}
            {!f.noPrize && f.prizes.length < MAX_PRIZES && (
              <Button size="sm" variant="ghost" icon="plus" className="justify-self-start" onClick={() => set("prizes", [...f.prizes, ""])}>
                {t("addPrize")}
              </Button>
            )}
          </fieldset>
          <TextField id="rulesUrl" type="url" label={t("rules")} hint={t("optional")} placeholder={t("rulesPlaceholder")} value={f.rulesUrl} onChange={(e) => set("rulesUrl", e.target.value)} error={err("rulesUrl")} />
          <Checkbox checked={f.noPrize} onChange={(e) => set("noPrize", e.target.checked)}>
            {t("noPrize")}
          </Checkbox>
        </div>
      ) : (
        <div className="grid gap-4">
          <TextArea id="missionText" label={t("mission")} rows={3} placeholder={t("missionPlaceholder")} value={f.missionText} maxLength={600} onChange={(e) => set("missionText", e.target.value)} />
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
            <TextField id="instructorFee" type="number" inputMode="numeric" min={0} label={t("fee")} placeholder={t("feePlaceholder")} value={f.instructorFee} onChange={(e) => set("instructorFee", e.target.value)} error={err("instructorFee")} />
            <TextField id="instructorCount" type="number" inputMode="numeric" min={0} max={20} label={t("count")} value={f.instructorCount} onChange={(e) => set("instructorCount", e.target.value)} />
          </div>
          <section aria-labelledby="suggested" className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Overline as="h2" id="suggested">
                {t("suggested")}
              </Overline>
              <span className="text-[13px] text-muted">{t("proposedCount", { count: fee ? proposed.length : 0 })}</span>
            </div>
            {!fee && <p className="text-[13px] text-muted">{t("feeFirst")}</p>}
            {mentors.length === 0 ? (
              <p className="text-sm text-muted">{t("noMentors")}</p>
            ) : (
              <ul className="m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
                {mentors.map((m) => {
                  const on = fee && proposed.includes(m.id);
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                      <Avatar initials={initials(m.name)} />
                      <span className="grid min-w-0 flex-1">
                        <b className="truncate">{m.name}</b>
                        <span className="truncate text-[13px] text-muted">{[m.domains.join(", "), m.city].filter(Boolean).join(" · ")}</span>
                      </span>
                      <Button size="sm" variant={on ? "secondary" : "ink"} aria-pressed={on} aria-label={on ? t("proposedLabel", { name: m.name }) : t("proposeLabel", { name: m.name })} disabled={!fee} onClick={() => setProposed((x) => (on ? x.filter((y) => y !== m.id) : [...x, m.id]))}>
                        {on ? t("proposed") : t("propose")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <p className="text-sm text-muted">{t("review")}</p>
        </div>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </AuthFrame>
  );
}
