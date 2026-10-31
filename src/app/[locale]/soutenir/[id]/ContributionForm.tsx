import { Alert } from "@/components/ui/Display";
import { formatFCFA } from "@/lib/format";

/**
 * What the pot has collected. Online payment is not wired yet: the payment provider
 * is still to be chosen, so sponsors are told contributions open soon.
 */
export function ContributionForm({ open, collected, contributors, companies }: { open: boolean; collected: number; contributors: number; companies: number }) {
  return (
    <div className="grid gap-4.5 rounded-lg border-2 border-line-strong bg-raised p-5 shadow-lg">
      <div className="grid gap-1">
        <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Déjà collecté</p>
        <p className="font-display text-[34px] leading-10 font-bold tracking-[-0.03em] tabular">{formatFCFA(collected)}</p>
        <p className="text-sm text-muted tabular">
          {contributors} contributeur{contributors > 1 ? "s" : ""}
          {companies ? `, dont ${companies} entreprise${companies > 1 ? "s" : ""}` : ""}
        </p>
      </div>
      {open ? (
        <Alert tone="info" title="Les contributions en ligne ouvrent bientôt.">
          Le paiement par Mobile Money ou carte sera disponible ici. Aucun compte KABAD ne sera demandé.
        </Alert>
      ) : (
        <Alert tone="info" title="Ce défi est clôturé.">
          La cagnotte n’accepte plus de contributions. Merci à tous les contributeurs !
        </Alert>
      )}
    </div>
  );
}
