"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { formatFCFA } from "@/lib/format";
import { dateAndHour } from "@/lib/time";

type Payout = { id: string; role: "WINNER" | "MENTOR" | "PLATFORM"; amount: number; beneficiary: string; operator: string | null; phone: string | null; challenge: string; payableFrom: string };
const ROLE = { WINNER: "Gagnant", MENTOR: "Mentor", PLATFORM: "KABAD" } as const;

function PayoutRow({ p }: { p: Payout }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read once: the list is reloaded after every action.
  const [payable] = useState(() => new Date(p.payableFrom).getTime() <= Date.now());

  async function sent() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/payouts/${p.id}`, { body: { reference } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’enregistrement n’a pas abouti.");
      setBusy(false);
    }
  }

  return (
    <Card className="gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{ROLE[p.role]}</Badge>
        <b>{formatFCFA(p.amount)}</b>
        <span className="text-sm text-muted">· {p.challenge}</span>
      </div>
      <p className="text-sm">
        {p.beneficiary}
        {p.operator ? ` · ${p.operator}` : ""}
        {p.phone ? ` · ${p.phone}` : ""}
      </p>
      {payable ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <TextField id={`ref-${p.id}`} label="Référence du transfert" value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} />
          <Button onClick={sent} disabled={busy || reference.trim().length < 3}>
            Marquer comme versé
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">Versement possible à partir du {dateAndHour(p.payableFrom)}.</p>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function PayoutList({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) return <p className="py-8 text-center text-muted">Aucun versement en attente.</p>;
  return payouts.map((p) => <PayoutRow key={p.id} p={p} />);
}
