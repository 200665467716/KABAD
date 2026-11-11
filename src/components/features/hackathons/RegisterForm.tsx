"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Card } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, RadioCard, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { initials, teamTitle } from "@/lib/format";
import type { HackathonDetail } from "@/lib/domain-types";
import type { Contact } from "@/lib/messaging-types";
import { MatePicker } from "./MatePicker";

type Mode = "solo" | "create" | "join";

/**
 * H3: enter alone, create a team and invite teammates, or ask a team to take you in ("Demander").
 * A member invited by a captain answers the invitation at the top of the screen.
 */
export function RegisterForm({ h, me }: { h: HackathonDetail; me: { name: string; photo: string | null } }) {
  const t = useTranslations("hackathons.register");
  const router = useRouter();
  const modes: Mode[] = [...(h.teamMin === 1 ? (["solo"] as const) : []), ...(h.teamMax > 1 ? (["create"] as const) : []), ...(h.teamMax > 1 && h.openTeams.length > 0 ? (["join"] as const) : [])];
  const [mode, setMode] = useState<Mode>(modes.includes("create") ? "create" : modes[0]);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Teams asked from this screen, added to those asked before.
  const [asked, setAsked] = useState<string[]>(h.openTeams.filter((x) => x.requested).map((x) => x.id));
  const [justAsked, setJustAsked] = useState(false);
  const [rules, setRules] = useState(false);
  const [skill, setSkill] = useState("");
  const [mates, setMates] = useState<Contact[]>([]);
  const [picking, setPicking] = useState(false);
  const [declined, setDeclined] = useState<string[]>([]);
  const invitations = h.invitations.filter((i) => !declined.includes(i.id));
  const needRules = () => setError({ text: t("needRules") });

  async function run(call: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await call();
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("failed") });
    } finally {
      setBusy(false);
    }
  }

  /** "Demander": the request leaves at once for this team; the captain answers. */
  const ask = (teamId: string) => {
    if (!rules) return needRules();
    run(async () => {
      await api(`/api/hackathons/${h.id}/register`, { body: { mode: "join", teamId, skill, rules } });
      setAsked((x) => [...x, teamId]);
      setJustAsked(true);
    });
  };

  /** The answer to a captain's invitation: joining opens "Mon équipe". */
  const answer = (id: string, accept: boolean) => {
    if (accept && !rules) return needRules();
    run(async () => {
      await api(`/api/team-requests/${id}`, { body: { accept } });
      if (accept) router.push(`/hackathons/${h.id}/equipe`);
      else setDeclined((x) => [...x, id]);
    });
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "join") return;
    const data = new FormData(e.currentTarget);
    const common = { skill, rules };
    const body = mode === "create" ? { mode, teamName: String(data.get("teamName") ?? ""), lookingFor: String(data.get("lookingFor") ?? ""), invite: mates.map((m) => m.id), ...common } : { mode, ...common };
    await run(async () => {
      await api(`/api/hackathons/${h.id}/register`, { body });
      router.push(`/hackathons/${h.id}/equipe`);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <Page narrow className="flex-1">
        <div className="grid gap-1">
          <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{h.title}</p>
          <h2 className="font-display text-2xl font-extrabold uppercase">{t("how")}</h2>
        </div>
        {invitations.map((i) => (
          <Card key={i.id} featured className="gap-3">
            <div className="flex items-center gap-3">
              <Avatar initials={initials(i.team)} square tone="brand" />
              <span className="grid min-w-0">
                <b className="truncate">{t("invitedTitle", { team: teamTitle(i.team, t("teamWord")) })}</b>
                <span className="text-[13px] text-muted">{t("invitedText", { name: i.captain, count: i.members, max: h.teamMax })}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" block disabled={busy} onClick={() => answer(i.id, false)}>
                {t("invitedDecline")}
              </Button>
              <Button variant="ink" size="sm" block disabled={busy} onClick={() => answer(i.id, true)}>
                {t("invitedAccept")}
              </Button>
            </div>
          </Card>
        ))}
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("pick")}</legend>
          {modes.map((m) => (
            <RadioCard key={m} name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} heading={t(`${m}.title`)} description={t(`${m}.desc`)} />
          ))}
        </fieldset>

        {mode === "create" && (
          <>
            <TextField id="teamName" name="teamName" label={t("teamName")} maxLength={40} error={error?.field === "teamName" ? error.text : undefined} />
            {/* H3: the captain, the teammates chosen so far, and "+" to invite a contact. */}
            <div className="flex flex-wrap items-center gap-2">
              <Avatar initials={initials(me.name)} src={me.photo} tone="accent" />
              {mates.map((m) => (
                <button key={m.id} type="button" onClick={() => setMates((x) => x.filter((y) => y.id !== m.id))} aria-label={t("removeMate", { name: m.name })} className="rounded-full">
                  <Avatar initials={initials(m.name)} src={m.photo} />
                </button>
              ))}
              {mates.length + 1 < h.teamMax && (
                <button type="button" onClick={() => setPicking(true)} aria-label={t("inviteMate")} className="inline-grid size-11 place-items-center rounded-full border-2 border-dashed border-line-strong text-ink hover:bg-raised">
                  <Icon name="plus" size={20} />
                </button>
              )}
              <span className="text-[13px] text-muted">{t("matesCount", { count: mates.length + 1, max: h.teamMax })}</span>
            </div>
            <TextField id="lookingFor" name="lookingFor" label={t("lookingFor")} hint={t("lookingForHint", { min: h.teamMin, max: h.teamMax })} maxLength={80} />
          </>
        )}

        {mode === "join" && (
          <>
            <ul className="m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
              {h.openTeams.map((team) => {
                const done = asked.includes(team.id);
                return (
                  <li key={team.id} className="flex items-center gap-3 px-3.5 py-3">
                    <Avatar initials={initials(team.name)} square tone="brand" />
                    <span className="grid min-w-0 flex-1">
                      <b className="truncate">{teamTitle(team.name, t("teamWord"))}</b>
                      <span className="truncate text-[13px] text-muted">{team.lookingFor ?? t("members", { count: team.members, max: h.teamMax })}</span>
                    </span>
                    <Button variant="secondary" size="sm" disabled={busy || done} aria-label={done ? t("askedLabel", { team: teamTitle(team.name, t("teamWord")) }) : t("askLabel", { team: teamTitle(team.name, t("teamWord")) })} onClick={() => ask(team.id)}>
                      {done ? t("alreadyAsked") : t("ask")}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {justAsked && (
              <Alert tone="success" role="status" title={t("requestedTitle")}>
                {t("requestedText")}
              </Alert>
            )}
          </>
        )}

        <TextField id="skill" name="skill" label={t("skill")} hint={t("skillHint")} maxLength={30} value={skill} onChange={(e) => setSkill(e.target.value)} />
        <Checkbox name="rules" checked={rules} onChange={(e) => setRules(e.target.checked)}>
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
        {mode === "join" ? (
          <Link href={`/hackathons/${h.id}`} className="grid min-h-11 place-items-center font-extrabold">
            {t("back")}
          </Link>
        ) : (
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? t("sending") : t("submit")}
          </Button>
        )}
      </ActionBar>
      <MatePicker
        open={picking}
        onClose={() => setPicking(false)}
        exclude={mates.map((m) => m.id)}
        max={Math.max(0, h.teamMax - 1 - mates.length)}
        onPick={(chosen) => {
          setMates((x) => [...x, ...chosen]);
          setPicking(false);
        }}
      />
    </form>
  );
}
