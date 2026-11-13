"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, Select, TextArea, TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import type { Level } from "@/lib/domain-types";
import { BIO_MAX, COUNTRIES, LEVELS } from "@/lib/schemas";

export function ProfileStep({ initial }: { initial: { country: string; city: string; level: Level; headline: string; bio: string } }) {
  const t = useTranslations("auth.profile");
  const tl = useTranslations("auth.levels");
  const router = useRouter();
  const [level, setLevel] = useState<Level>(initial.level);
  // P8: a presentation from the start, read on the profile and by whoever receives an invitation.
  const [bio, setBio] = useState(initial.bio);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const country = String(data.get("country") ?? "");
    const city = String(data.get("city") ?? "").trim();
    const headline = String(data.get("headline") ?? "").trim();
    if (!country || city.length < 2) return setError(t("required"));
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "PATCH", body: { country, city, level, headline, bio: bio.trim(), diaspora: !["Bénin", "Burkina Faso", "Cameroun", "Côte d’Ivoire", "Ghana", "Mali", "Niger", "Nigeria", "RD Congo", "Sénégal", "Togo"].includes(country) } });
      router.push("/inscription/interets");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/verifier-email"
        heading={t("heading")}
        step={3}
        title={t("title")}
        lead={t("lead")}
        footer={
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? t("busy") : t("submit")}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Select id="country" name="country" label={t("country")} defaultValue={initial.country}>
            <option value="" disabled>
              {t("countryPlaceholder")}
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <TextField id="city" name="city" label={t("city")} autoComplete="address-level2" defaultValue={initial.city} />
        </div>
        <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-extrabold">{t("level")}</legend>
          {LEVELS.map((l) => (
            <RadioCard key={l} name="level" value={l} checked={level === l} onChange={() => setLevel(l)} heading={tl(`${l}.title`)} description={tl(`${l}.desc`)} />
          ))}
        </fieldset>
        <TextField id="headline" name="headline" label={t("headline")} hint={t("optional")} placeholder={t("headlinePlaceholder")} maxLength={80} defaultValue={initial.headline} />
        <TextArea
          id="bio"
          label={t("bio")}
          hint={t("bioHint")}
          placeholder={t("bioPlaceholder")}
          rows={5}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          counter={`${bio.length} / ${BIO_MAX}`}
        />
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </AuthFrame>
    </form>
  );
}
