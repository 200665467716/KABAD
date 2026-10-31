"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar } from "@/components/ui/Display";
import { Checkbox, RadioCard, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { HackathonDetail } from "@/lib/domain-types";

type Mode = "solo" | "create" | "join";

/** H3: enter alone, create a team, or ask to join a team looking for a profile. */
export function RegisterForm({ h }: { h: HackathonDetail }) {
  const t = useTranslations("hackathons.register");
  const router = useRouter();
  const modes: Mode[] = [...(h.teamMin === 1 ? (["solo"] as const) : []), ...(h.teamMax > 1 ? (["create"] as const) : []), ...(h.teamMax > 1 && h.openTeams.length > 0 ? (["join"] as const) : [])];
  const [mode, setMode] = useState<Mode>(modes.includes("create") ? "create" : modes[0]);
  const [teamId, setTeamId] = useState<string | null>(h.openTeams.find((x) => !x.requested)?.id ?? null);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const common = { skill: String(data.get("skill") ?? ""), rules: data.get("rules") === "on" };
    const body = mode === "create" ? { mode, teamName: String(data.get("teamName") ?? ""), lookingFor: String(data.get("lookingFor") ?? ""), ...common } : mode === "join" ? { mode, teamId, ...common } : { mode, ...common };
    setBusy(true);
    setError(null);
    try {
      await api(`/api/hackathons/${h.id}/register`, { body });
      if (mode === "join") setRequested(true);
      else router.push(`/hackathons/${h.id}/equipe`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("failed") });
    } finally {
      setBusy(false);
    }
  }

  if (requested) {
    return (
      <Page narrow>
        <Alert tone="success" title={t("requestedTitle")}>
          {t("requestedText")}
        </Alert>
        <Link href={`/hackathons/${h.id}`} className="font-extrabold">
          {t("back")}
        </Link>
      </Page>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <Page narrow className="flex-1">
        <div className="grid gap-1">
          <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{h.title}</p>
          <h2 className="font-display text-2xl font-extrabold uppercase">{t("how")}</h2>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("pick")}</legend>
          {modes.map((m) => (
            <RadioCard key={m} name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} heading={t(`${m}.title`)} description={t(`${m}.desc`)} />
          ))}
        </fieldset>

        {mode === "create" && (
          <>
            <TextField id="teamName" name="teamName" label={t("teamName")} maxLength={40} error={error?.field === "teamName" ? error.text : undefined} />
            <TextField id="lookingFor" name="lookingFor" label={t("lookingFor")} hint={t("lookingForHint", { min: h.teamMin, max: h.teamMax })} maxLength={80} />
          </>
        )}

        {mode === "join" && (
          <ul className="m-0 grid list-none gap-2 p-0">
            {h.openTeams.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  disabled={team.requested}
                  aria-pressed={teamId === team.id}
                  onClick={() => setTeamId(team.id)}
                  className={cn("flex w-full items-center gap-3 rounded-action border-2 px-3.5 py-3 text-left", teamId === team.id ? "border-brand bg-brand-soft" : "border-line-strong bg-raised", team.requested && "opacity-60")}
                >
                  <Avatar initials={initials(team.name)} square tone="brand" />
                  <span className="grid min-w-0 flex-1">
                    <b className="truncate">{team.name}</b>
                    <span className="truncate text-[13px] text-muted">{team.lookingFor ?? t("members", { count: team.members, max: h.teamMax })}</span>
                  </span>
                  <span className="text-sm font-extrabold text-brand-text">{team.requested ? t("alreadyAsked") : t("ask")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <TextField id="skill" name="skill" label={t("skill")} hint={t("skillHint")} maxLength={30} />
        <Checkbox name="rules">
          {t("acceptRules")}{" "}
          {h.rulesUrl ? (
            <a href={h.rulesUrl} target="_blank" rel="noreferrer" className="font-extrabold">
              {t("rules")}
            </a>
          ) : (
            <b>{t("rules")}</b>
          )}
          .
        </Checkbox>
        {error && error.field !== "teamName" && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy || (mode === "join" && !teamId)}>
          {busy ? t("sending") : mode === "join" ? t("submitJoin") : t("submit")}
        </Button>
      </ActionBar>
    </form>
  );
}
