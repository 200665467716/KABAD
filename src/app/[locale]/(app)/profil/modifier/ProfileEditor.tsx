"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { RadioCard, Select, TextArea, TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import type { Level } from "@/lib/domain-types";
import { COUNTRIES, GOALS, LEVELS, TECH_CHOICES } from "@/lib/schemas";
import { zoneChoices, zoneCity } from "@/lib/time-zones";
import { ProfilePhoto } from "./ProfilePhoto";

type Goal = (typeof GOALS)[number];
type Initial = { country: string; city: string; level: Level; headline: string; bio: string; profileLink: string; stack: string[]; goals: string[]; gender: "FEMALE" | "MALE" | null; timeZone: string };
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function ProfileEditor({ initial, name, photo }: { initial: Initial; name: string; photo: string | null }) {
  const t = useTranslations("profile.edit");
  const tl = useTranslations("profile.levels");
  const tg = useTranslations("auth.goals");
  const router = useRouter();
  const [level, setLevel] = useState<Level>(initial.level);
  const [stack, setStack] = useState(initial.stack);
  const [goals, setGoals] = useState<Goal[]>(initial.goals.filter((g): g is Goal => (GOALS as readonly string[]).includes(g)));
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const choices = [...new Set([...TECH_CHOICES, ...stack])];

  function addTech() {
    const v = extra.trim();
    if (v && !stack.includes(v) && stack.length < 12) setStack([...stack, v]);
    setExtra("");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const text = (k: string) => String(d.get(k) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: { country: text("country") || undefined, city: text("city") || undefined, level, headline: text("headline"), bio: text("bio"), profileLink: text("profileLink"), stack, goals, gender: text("gender") || null, timeZone: text("timeZone") },
      });
      router.push("/profil");
      router.refresh();
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("failed") });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="contents">
      <Page narrow>
        <ProfilePhoto name={name} initial={photo} />
        <div className="grid grid-cols-2 gap-2.5">
          <Select id="country" name="country" label={t("country")} defaultValue={initial.country}>
            <option value="">{t("countryPlaceholder")}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <TextField id="city" name="city" label={t("city")} defaultValue={initial.city} error={fieldError("city")} />
          <Select id="timeZone" name="timeZone" label={t("timeZone")} hint={t("timeZoneHint")} defaultValue={initial.timeZone}>
            {zoneChoices(initial.timeZone).map((z) => (
              <option key={z} value={z}>
                {zoneCity(z)}
              </option>
            ))}
          </Select>
          <Select id="gender" name="gender" label={t("gender")} hint={t("genderHint")} defaultValue={initial.gender ?? ""}>
            <option value="">{t("genderNone")}</option>
            <option value="FEMALE">{t("genderFemale")}</option>
            <option value="MALE">{t("genderMale")}</option>
          </Select>
        </div>
        <TextField id="headline" name="headline" label={t("headline")} hint={t("headlineHint")} defaultValue={initial.headline} maxLength={80} />
        <TextArea id="bio" name="bio" label={t("bio")} hint={t("bioHint")} defaultValue={initial.bio} maxLength={600} rows={4} />
        <TextField id="profileLink" name="profileLink" label={t("profileLink")} hint={t("profileLinkHint")} defaultValue={initial.profileLink} error={fieldError("profileLink")} />
        <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-extrabold">{t("level")}</legend>
          {LEVELS.map((l) => (
            <RadioCard key={l} name="level" value={l} checked={level === l} onChange={() => setLevel(l)} heading={tl(l)} />
          ))}
        </fieldset>
        <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-extrabold">{t("stack")}</legend>
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <ToggleChip key={c} pressed={stack.includes(c)} onClick={() => setStack((s) => toggle(s, c))}>
                {c}
              </ToggleChip>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <TextField
              id="extra"
              label={t("addTech")}
              value={extra}
              maxLength={30}
              onChange={(e) => setExtra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTech();
                }
              }}
            />
            <Button variant="secondary" onClick={addTech}>
              {t("addTechButton")}
            </Button>
          </div>
        </fieldset>
        <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-extrabold">{t("goals")}</legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <ToggleChip key={g} pressed={goals.includes(g)} onClick={() => setGoals((s) => toggle(s, g))}>
                {tg(g)}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t("busy") : t("save")}
        </Button>
      </ActionBar>
    </form>
  );
}
