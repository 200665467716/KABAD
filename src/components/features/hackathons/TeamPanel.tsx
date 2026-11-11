"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Card, Overline } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { TeamView } from "@/lib/domain-types";
import { ActionButton } from "./ActionButton";
import { MatePicker } from "./MatePicker";

/** The captain's tools: requests to join, the open call ("cherche un·e designer"), and leaving the team. */
export function TeamPanel({ team, meId, hackathonId, canChange, full, placesLeft }: { team: TeamView; meId: string; hackathonId: string; canChange: boolean; full: boolean; placesLeft: number }) {
  const t = useTranslations("hackathons.team");
  const router = useRouter();
  const captain = team.captainId === meId;
  const [editing, setEditing] = useState(false);
  const [call, setCall] = useState(team.lookingFor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  /** H3: the captain invites contacts; each of them answers from the "Participer" screen. */
  async function invite(memberIds: string[]) {
    setInviting(true);
    setInviteError(null);
    try {
      await api(`/api/teams/${team.id}/invites`, { body: { memberIds } });
      setPicking(false);
      router.refresh();
    } catch (e) {
      setPicking(false);
      setInviteError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setInviting(false);
    }
  }

  async function saveCall() {
    setError(null);
    try {
      await api(`/api/teams/${team.id}`, { method: "PATCH", body: { lookingFor: call.trim() || null } });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    }
  }

  return (
    <>
      {captain && team.requests.length > 0 && (
        <section aria-labelledby="requests" className="grid gap-2">
          <Overline as="h2" id="requests">
            {t("requests", { count: team.requests.length })}
          </Overline>
          {team.requests.map((r) => (
            <Card key={r.id} className="gap-3">
              <div className="flex items-center gap-3">
                <Avatar initials={initials(r.user.name)} />
                <span className="grid">
                  <b>{r.user.name}</b>
                  <span className="text-[13px] text-muted">{r.user.city}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton url={`/api/team-requests/${r.id}`} body={{ accept: false }} size="sm" block>
                  {t("decline")}
                </ActionButton>
                <ActionButton url={`/api/team-requests/${r.id}`} body={{ accept: true }} variant="primary" size="sm" block>
                  {full ? t("full") : t("accept")}
                </ActionButton>
              </div>
            </Card>
          ))}
        </section>
      )}

      {captain && !team.solo && canChange && placesLeft > 0 && (
        <>
          <Button variant="secondary" icon="userPlus" className="justify-self-start" onClick={() => setPicking(true)}>
            {t("invite")}
          </Button>
          <MatePicker open={picking} onClose={() => setPicking(false)} exclude={[...team.members.map((m) => m.id), ...team.invites.map((i) => i.user.id), ...team.requests.map((r) => r.user.id)]} max={placesLeft} busy={inviting} onPick={(chosen) => invite(chosen.map((c) => c.id))} />
        </>
      )}
      {inviteError && (
        <Alert tone="danger" role="alert">
          {inviteError}
        </Alert>
      )}

      {!team.solo && canChange && (
        <Card className="gap-2 border-dashed">
          <p className="font-extrabold">{t("missingProfile")}</p>
          {editing && captain ? (
            <>
              <TextField id="call" label={t("callLabel")} value={call} maxLength={80} onChange={(e) => setCall(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </Button>
                <Button size="sm" onClick={saveCall}>
                  {t("save")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{team.lookingFor ? `« ${team.lookingFor} »` : t("noCall")}</p>
              {captain && (
                <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setEditing(true)}>
                  {team.lookingFor ? t("editCall") : t("publishCall")}
                </Button>
              )}
            </>
          )}
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </Card>
      )}

      {canChange && (
        <ActionButton url={`/api/teams/${team.id}`} method="DELETE" variant="ghost" size="sm" confirm={captain && team.members.length > 1 ? t("leaveCaptain") : t("leaveConfirm")} then={`/hackathons/${hackathonId}`}>
          {team.solo ? t("withdraw") : t("leave")}
        </ActionButton>
      )}
    </>
  );
}
