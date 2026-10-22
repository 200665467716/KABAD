"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { shortDate } from "@/lib/time";

type Row = {
  id: string;
  name: string;
  email: string;
  role: "JUNIOR" | "SENIOR";
  place: string;
  years: number;
  profileLink: string;
  isAdmin: boolean;
  emailVerified: boolean;
  seniorVerified: boolean;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
  reportsReceived: number;
};

function MemberRow({ m, meId }: { m: Row; meId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"reject" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/members/${m.id}`, { body });
      setMode(null);
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
        <Link href={`/profil/${m.id}`} className="font-bold text-ink">
          {m.name}
        </Link>
        {m.isAdmin && <Badge tone="brand">Équipe</Badge>}
        {m.role === "SENIOR" && <Badge tone={m.seniorVerified ? "success" : "accent"}>{m.seniorVerified ? "Senior vérifié" : "Senior à vérifier"}</Badge>}
        {!m.emailVerified && <Badge>E-mail non confirmé</Badge>}
        {m.suspended && <Badge tone="danger">Suspendu</Badge>}
        {m.reportsReceived > 0 && <Badge tone="danger">{m.reportsReceived} signalement{m.reportsReceived > 1 ? "s" : ""}</Badge>}
      </div>
      <p className="text-sm text-muted">
        {m.email} · {m.place || "lieu non renseigné"} · {m.years} an{m.years > 1 ? "s" : ""} d’expérience · inscrit le {shortDate(m.createdAt)}
      </p>
      {m.role === "SENIOR" && m.profileLink && (
        <a href={`https://${m.profileLink}`} target="_blank" rel="noreferrer" className="text-sm font-bold">
          Vérifier le profil : {m.profileLink}
        </a>
      )}
      {m.suspended && m.suspensionReason && <p className="text-sm">Motif : {m.suspensionReason}</p>}
      {mode && (
        <TextField id={`reason-${m.id}`} label={mode === "suspend" ? "Motif de la suspension" : "Pourquoi le statut n’est pas validé (lu par le membre)"} value={reason} maxLength={250} onChange={(e) => setReason(e.target.value)} />
      )}
      {m.id !== meId && !m.isAdmin && (
        <div className="flex flex-wrap gap-2">
          {mode ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={busy}>
                Annuler
              </Button>
              <Button size="sm" variant="danger" onClick={() => act({ action: mode, reason })} disabled={busy}>
                {mode === "suspend" ? "Confirmer la suspension" : "Refuser le statut"}
              </Button>
            </>
          ) : (
            <>
              {m.role === "SENIOR" && !m.seniorVerified && (
                <>
                  <Button size="sm" variant="success" onClick={() => act({ action: "verify" })} disabled={busy}>
                    Valider le statut Senior
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setMode("reject")} disabled={busy}>
                    Refuser
                  </Button>
                </>
              )}
              {m.suspended ? (
                <Button size="sm" variant="secondary" onClick={() => act({ action: "reinstate" })} disabled={busy}>
                  Lever la suspension
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setMode("suspend")} disabled={busy}>
                  Suspendre
                </Button>
              )}
            </>
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

export function MemberAdmin({ members, meId }: { members: Row[]; meId: string }) {
  if (members.length === 0) return <p className="py-8 text-center text-muted">Aucun membre ne correspond.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {members.map((m) => (
        <MemberRow key={m.id} m={m} meId={meId} />
      ))}
    </div>
  );
}
