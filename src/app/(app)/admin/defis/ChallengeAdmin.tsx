"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { dateAndHour } from "@/lib/time";

type Row = { id: string; title: string; kind: string; status: "OPEN" | "JURY" | "DONE"; closesAt: string; submissions: number; jury: string[] };
const STATUS = { OPEN: { label: "Ouvert", tone: "brand" }, JURY: { label: "En jury", tone: "accent" }, DONE: { label: "Terminé", tone: "success" } } as const;

function Row({ c }: { c: Row }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"close" | "publish" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "close" | "publish") {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/challenges/${c.id}/${action}`, { method: "POST" });
      setConfirm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’action n’a pas abouti.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
        <Link href={`/defis/${c.id}`} className="font-bold text-ink">
          {c.title}
        </Link>
      </div>
      <p className="text-sm text-muted">
        Clôture : {dateAndHour(c.closesAt)} · {c.submissions} solution{c.submissions > 1 ? "s" : ""} · Jury : {c.jury.join(", ")}
      </p>
      {confirm ? (
        <div className="grid gap-2 rounded-md bg-sunken p-3 text-sm">
          <p>{confirm === "close" ? "Clôturer maintenant ? Les participants ne pourront plus soumettre." : "Publier les résultats ? Les versements 60/30/10 seront préparés ; ils se font après 48 h de contestation."}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => run(confirm)} disabled={busy}>
              {busy ? "…" : "Confirmer"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {c.status === "OPEN" && (
            <Button size="sm" variant="secondary" onClick={() => setConfirm("close")}>
              Clôturer maintenant
            </Button>
          )}
          {c.status === "JURY" && (
            <Button size="sm" onClick={() => setConfirm("publish")}>
              Publier les résultats
            </Button>
          )}
          {c.status === "DONE" && (
            <Link href={`/defis/${c.id}/resultats`} className="text-sm font-bold">
              Voir les résultats
            </Link>
          )}
        </div>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function ChallengeAdmin({ challenges }: { challenges: Row[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {challenges.map((c) => (
        <Row key={c.id} c={c} />
      ))}
    </div>
  );
}
