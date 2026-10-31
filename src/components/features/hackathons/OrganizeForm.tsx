"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { ToggleChip } from "@/components/ui/Controls";
import { Checkbox, Select, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

type Format = "ONLINE" | "ONSITE" | "HYBRID";
type Prize = "NONE" | "LOT" | "SPONSORISE" | "CAGNOTTE";
const SIZES = { solo: [1, 1], soloOrTeam: [1, 5], range25: [2, 5], range34: [3, 4] } as const;
const LEVELS = ["Tous niveaux", "Débutant", "Intermédiaire", "Avancé"] as const;

/** "2026-11-14T08:00" from the field, sent as an ISO date with the browser's offset. */
const iso = (local: string) => (local ? new Date(local).toISOString() : "");

/** H6 and H7: an organizer describes the hackathon, then the challenge and the prizes. Instructors come after (H8). */
export function OrganizeForm({ defaultOrganizer }: { defaultOrganizer: string }) {
  const t = useTranslations("hackathons.organize");
  const tf = useTranslations("hackathons.format");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
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
    prize: "NONE" as Prize,
    prizes: [""] as string[],
    sponsorName: "",
    sponsorAmount: "",
    rulesUrl: "",
    mentoring: false,
    missionText: "",
    instructorFee: "",
    instructorCount: "2",
  });
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (k: string) => (error?.field === k ? error.text : undefined);
  const step1Fields = ["title", "organizerName", "city", "startsAt", "endsAt", "closesAt", "teamMin", "stack"];

  async function submit() {
    setBusy(true);
    setError(null);
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
          prizeKind: f.prize === "NONE" ? undefined : f.prize,
          prizes: f.prize === "NONE" ? [] : f.prizes.map((p) => p.trim()).filter(Boolean),
          sponsorName: f.prize === "SPONSORISE" ? f.sponsorName : undefined,
          sponsorAmount: f.prize === "SPONSORISE" ? Number(f.sponsorAmount || 0) : undefined,
          mentoringMinutes: f.mentoring ? 60 : 0,
          missionText: f.missionText || undefined,
          instructorFee: f.instructorFee ? Number(f.instructorFee) : undefined,
          instructorCount: f.instructorFee ? Number(f.instructorCount || 0) : 0,
        },
      });
      router.push(f.instructorFee ? `/hackathons/${id}/instructeurs` : `/hackathons/${id}`);
    } catch (x) {
      const field = x instanceof ApiError ? x.field : undefined;
      setError({ field, text: x instanceof ApiError ? x.message : t("failed") });
      if (field && step1Fields.includes(field)) setStep(1);
      setBusy(false);
    }
  }

  const footer =
    step === 1 ? (
      <Button size="lg" block onClick={() => setStep(2)} disabled={!f.title.trim() || !f.startsAt || !f.endsAt || !f.closesAt}>
        {t("continue")}
      </Button>
    ) : (
      <>
        <Button size="lg" block onClick={submit} disabled={busy || f.description.trim().length < 30}>
          {busy ? t("sending") : t("send")}
        </Button>
        <Button variant="ghost" onClick={() => setStep(1)}>
          {t("back")}
        </Button>
      </>
    );

  return (
    <AuthFrame back="/hackathons" heading={t("heading")} step={step} steps={3} title={step === 1 ? t("step1") : t("step2")} lead={step === 1 ? t("lead1") : t("lead2")} footer={footer}>
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
          <div className="grid grid-cols-2 gap-3">
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
      ) : (
        <div className="grid gap-4">
          <TextArea id="description" label={t("challenge")} rows={4} value={f.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} error={err("description")} />
          <Select id="prize" label={t("prizeKind")} value={f.prize} onChange={(e) => set("prize", e.target.value as Prize)}>
            {(["NONE", "LOT", "SPONSORISE", "CAGNOTTE"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`prizeKinds.${k}`)}
              </option>
            ))}
          </Select>
          {f.prize !== "NONE" && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-extrabold">{t("prizes")}</legend>
              {f.prizes.map((p, i) => (
                <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-ink font-display text-sm font-extrabold text-accent">{i + 1}</span>
                  <TextField id={`prize-${i}`} label={t("prizeLabel", { rank: i + 1 })} className="[&>label]:sr-only" value={p} maxLength={120} onChange={(e) => set("prizes", f.prizes.map((x, j) => (j === i ? e.target.value : x)))} />
                </div>
              ))}
              {f.prizes.length < 5 && (
                <Button size="sm" variant="secondary" icon="plus" className="justify-self-start" onClick={() => set("prizes", [...f.prizes, ""])}>
                  {t("addPrize")}
                </Button>
              )}
            </fieldset>
          )}
          {f.prize === "SPONSORISE" && (
            <div className="grid grid-cols-2 gap-3">
              <TextField id="sponsorName" label={t("sponsor")} value={f.sponsorName} maxLength={120} onChange={(e) => set("sponsorName", e.target.value)} />
              <TextField id="sponsorAmount" type="number" min={0} label={t("sponsorAmount")} value={f.sponsorAmount} onChange={(e) => set("sponsorAmount", e.target.value)} />
            </div>
          )}
          {(f.prize === "SPONSORISE" || f.prize === "CAGNOTTE") && (
            <Checkbox checked={f.mentoring} onChange={(e) => set("mentoring", e.target.checked)}>
              {t("mentoring")}
            </Checkbox>
          )}
          <TextField id="rulesUrl" type="url" label={t("rules")} hint={t("optional")} placeholder="https://" value={f.rulesUrl} onChange={(e) => set("rulesUrl", e.target.value)} error={err("rulesUrl")} />
          <div className="grid gap-3 rounded-lg border-2 border-dashed border-line-strong p-4">
            <p className="font-extrabold">{t("instructorsTitle")}</p>
            <p className="text-sm text-muted">{t("instructorsText")}</p>
            <TextArea id="missionText" label={t("mission")} rows={3} value={f.missionText} maxLength={600} onChange={(e) => set("missionText", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <TextField id="instructorFee" type="number" min={0} label={t("fee")} value={f.instructorFee} onChange={(e) => set("instructorFee", e.target.value)} error={err("instructorFee")} />
              <TextField id="instructorCount" type="number" min={0} max={20} label={t("count")} value={f.instructorCount} onChange={(e) => set("instructorCount", e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-muted">{t("review")}</p>
        </div>
      )}
      {error && (step === 2 || !step1Fields.includes(error.field ?? "")) && (
        <Alert tone="danger" role="alert">
          {error.text}
        </Alert>
      )}
    </AuthFrame>
  );
}
