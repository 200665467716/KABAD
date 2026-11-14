"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, TextArea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { ActionButton } from "./ActionButton";

type Mentor = { id: string; name: string; city: string };

/** Three badged mentors form the jury. */
function JuryPicker({ hackathonId, mentors, current }: { hackathonId: string; mentors: Mentor[]; current: string[] }) {
  const t = useTranslations("hackathons.admin");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/hackathons/${hackathonId}/jury`, { method: "PUT", body: { jurorIds: picked } });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {current.length ? t("changeJury") : t("setJury")}
      </Button>
    );
  }
  return (
    <fieldset className="grid gap-2 rounded-action border-2 border-line-strong bg-bg p-3">
      <legend className="px-1 text-sm font-extrabold">{t("pickJury", { count: picked.length })}</legend>
      {mentors.map((m) => (
        <Checkbox
          key={m.id}
          checked={picked.includes(m.id)}
          disabled={!picked.includes(m.id) && picked.length >= 3}
          onChange={(e) => setPicked((p) => (e.target.checked ? [...p, m.id] : p.filter((x) => x !== m.id)))}
        >
          {m.name}
          {m.city ? ` · ${m.city}` : ""}
        </Checkbox>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button size="sm" variant="ink" onClick={save} disabled={busy || picked.length !== 3}>
          {t("saveJury")}
        </Button>
      </div>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </fieldset>
  );
}

/** Refuses a proposed hackathon: the reason is required, its organizer reads it (P7). */
function RejectForm({ hackathonId }: { hackathonId: string }) {
  const t = useTranslations("hackathons.admin");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reject() {
    if (reason.trim().length < 10) return setError(t("rejectReasonShort"));
    setBusy(true);
    setError(null);
    try {
      await api(`/api/hackathons/${hackathonId}/reject`, { body: { reason: reason.trim() } });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {t("reject")}
      </Button>
    );
  }
  return (
    <div className="grid w-full gap-2 rounded-action border-2 border-line-strong bg-bg p-3">
      <TextArea id={`reject-${hackathonId}`} label={t("rejectReason")} hint={t("rejectHint")} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button size="sm" variant="danger" onClick={reject} disabled={busy}>
          {t("rejectConfirm")}
        </Button>
      </div>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </div>
  );
}

/** The KABAD team's actions on a hackathon: publish or refuse a proposal, name the jury, close, publish the results. */
export function AdminActions({ id, status, published, rejected, mentors, jury }: { id: string; status: "OPEN" | "JURY" | "DONE"; published: boolean; rejected?: boolean; mentors: Mentor[]; jury: string[] }) {
  const t = useTranslations("hackathons.admin");
  // A refused hackathon has no action left; the team can still publish it from its page if it changes its mind.
  if (rejected) return null;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {!published && <RejectForm hackathonId={id} />}
      {!published && (
        // En encre, pas en indigo : la page de l'admin montre ces actions pour chaque hackathon, et un écran n'a qu'un bouton indigo.
        <ActionButton url={`/api/hackathons/${id}/publish`} variant="ink" size="sm" confirm={t("publishConfirm")}>
          {t("publish")}
        </ActionButton>
      )}
      {status !== "DONE" && <JuryPicker hackathonId={id} mentors={mentors} current={jury} />}
      {status === "OPEN" && published && (
        <ActionButton url={`/api/hackathons/${id}/close`} size="sm" confirm={t("closeConfirm")}>
          {t("close")}
        </ActionButton>
      )}
      {status === "JURY" && (
        <ActionButton url={`/api/hackathons/${id}/results`} variant="ink" size="sm" confirm={t("resultsConfirm")}>
          {t("results")}
        </ActionButton>
      )}
    </div>
  );
}
