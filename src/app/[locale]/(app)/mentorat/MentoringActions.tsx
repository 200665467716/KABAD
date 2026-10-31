"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, PersonRow } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import { localInputValue, sessionWhen } from "@/lib/time";
import type { MentorRequestView } from "@/lib/domain-types";


export function ReceivedRequests({ requests }: { requests: MentorRequestView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function answer(id: string, accept: boolean) {
    setBusy(id);
    setError(null);
    try {
      await api(`/api/mentoring/requests/${id}`, { body: { accept } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La réponse n’a pas été envoyée. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {error && (
        <Alert tone="danger" role="alert" className="md:col-span-2">
          {error}
        </Alert>
      )}
      {requests.map((r) => (
        <Card key={r.id} className="content-start gap-3">
          <PersonRow avatar={<Avatar initials={initials(r.mentee.name)} tone="accent" />} name={r.mentee.name} meta={r.mentee.city} />
          <div className="grid gap-1">
            <span className="font-bold">{r.project}</span>
            <p className="text-sm">{r.situation}</p>
            {r.repo && <span className="font-mono text-xs text-muted">{r.repo}</span>}
          </div>
          {r.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.topics.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Button variant="secondary" disabled={busy !== null} onClick={() => answer(r.id, false)}>
              Décliner
            </Button>
            <Button disabled={busy !== null} onClick={() => answer(r.id, true)} aria-label={`Accepter la demande de ${r.mentee.name}`}>
              {busy === r.id ? "Envoi…" : "Accepter"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function NextSessionPlanner({ pairId, at }: { pairId: string; at: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save(next: string | null) {
    setError(null);
    try {
      await api(`/api/mentoring/pairs/${pairId}/next`, { body: { at: next } });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La date n’a pas été enregistrée.");
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-sunken px-3.5 py-2.5 text-sm">
        <span>
          <span className="text-muted">Prochaine séance : </span>
          <b>{at ? sessionWhen(at) : "à planifier"}</b>
        </span>
        <button
          type="button"
          className="font-bold text-brand-text"
          onClick={() => {
            const d = at ? new Date(at) : new Date(Date.now() + 86_400_000);
            if (!at) d.setHours(19, 0, 0, 0);
            setValue(localInputValue(d));
            setEditing(true);
          }}
        >
          {at ? "Modifier" : "Planifier"}
        </button>
      </div>
    );
  }
  return (
    <form
      className="grid gap-2 rounded-md bg-sunken p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) save(new Date(value).toISOString());
      }}
    >
      <TextField id={`next-${pairId}`} type="datetime-local" label="Prochaine séance" value={value} onChange={(e) => setValue(e.target.value)} error={error} />
      <div className="flex justify-end gap-2">
        {at && (
          <Button variant="ghost" size="sm" onClick={() => save(null)}>
            Retirer
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
          Annuler
        </Button>
        <Button type="submit" size="sm">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function SentRequestList({ sent }: { sent: MentorRequestView[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="gap-2">
      <h2 className="font-bold">Demandes envoyées</h2>
      <p className="text-sm text-muted">Sans réponse sous 7 jours, une demande expire et vous pouvez choisir un autre mentor.</p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {sent.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span className="text-sm">
              <b>{r.mentor.name}</b> · {r.project}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                api(`/api/mentoring/requests/${r.id}`, { method: "DELETE" })
                  .then(() => router.refresh())
                  .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible d’annuler."))
              }
              aria-label={`Annuler la demande à ${r.mentor.name}`}
            >
              Annuler
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function EndPairButton({ pairId, other }: { pairId: string; other: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="justify-self-start py-2 text-sm font-bold text-muted underline">
        Terminer ce binôme
      </button>
    );
  }
  return (
    <div className="grid gap-2 rounded-md bg-sunken p-3 text-sm">
      <p>Terminer le binôme avec {other} ? Vos séances confirmées restent comptées.</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
          Annuler
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() =>
            api(`/api/mentoring/pairs/${pairId}/end`, { method: "POST" })
              .then(() => router.refresh())
              .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de terminer le binôme."))
          }
        >
          Terminer
        </Button>
      </div>
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}
