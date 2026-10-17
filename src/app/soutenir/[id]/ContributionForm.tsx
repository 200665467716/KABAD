"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatFCFA } from "@/lib/format";

const AMOUNTS = [5000, 10000, 25000, 50000];
const MIN = 500;

/**
 * Sponsors contribute without creating an account. Payment happens on the payment
 * provider's hosted page; the provider is chosen in the specification (FedaPay for the demo).
 */
export function ContributionForm({ collected, contributors, companies }: { collected: number; contributors: number; companies: number }) {
  const [amount, setAmount] = useState(10000);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const value = custom ? Number(custom.replace(/\D/g, "")) : amount;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    if (!Number.isInteger(value) || value < MIN) return setError(`Le montant minimum est de ${formatFCFA(MIN)}.`);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Indiquez une adresse e-mail valide pour recevoir le reçu.");
    setError(null);
    setReady(true);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4.5 rounded-lg border border-line bg-raised p-5 shadow-lg">
      <div className="grid gap-1">
        <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Déjà collecté</p>
        <p className="font-display text-[34px] leading-10 font-bold tracking-[-0.03em] tabular">{formatFCFA(collected)}</p>
        <p className="text-sm text-muted tabular">
          {contributors} contributeurs{companies ? `, dont ${companies} entreprises` : ""}
        </p>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-bold">Votre contribution</legend>
        <div className="grid grid-cols-2 gap-2">
          {AMOUNTS.map((a) => {
            const on = !custom && amount === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setAmount(a);
                  setCustom("");
                }}
                className={cn("h-13 rounded-md border text-base font-bold tabular", on ? "border-brand bg-brand-soft text-brand-text shadow-[inset_0_0_0_1px_var(--brand)]" : "border-line-strong bg-raised text-ink hover:bg-sunken")}
              >
                {formatFCFA(a)}
              </button>
            );
          })}
        </div>
        <TextField id="custom" label={<span className="font-normal text-muted">Autre montant (F CFA)</span>} inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Par exemple 15 000" inputClassName="tabular" />
      </fieldset>
      <TextField id="display" name="display" label="Nom affiché (personne ou entreprise)" defaultValue="Atelier Numérique de Cotonou" />
      <TextField id="email" name="email" type="email" label="E-mail pour le reçu" defaultValue="contact@exemple.bj" />
      <Checkbox name="anonymous">Contribuer anonymement</Checkbox>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      {ready ? (
        <Alert tone="info" role="status" title="Démonstration.">
          Ici, vous seriez redirigé vers la page de paiement sécurisée pour régler {formatFCFA(value)}.
        </Alert>
      ) : (
        <Button type="submit" size="lg" block>
          Contribuer {value >= MIN ? formatFCFA(value) : ""}
        </Button>
      )}
      <p className="flex items-start gap-1.5 text-xs text-muted">
        <Icon name="lock" size={16} className="mt-px" />
        Mobile Money ou carte, sur la page sécurisée de notre prestataire de paiement. Aucun compte KABAD n’est demandé.
      </p>
    </form>
  );
}
