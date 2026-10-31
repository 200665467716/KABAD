import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppTile } from "@/components/features/AppTile";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Overline } from "@/components/ui/Display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getTestApp } from "@/server/community-tests";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export const metadata: Metadata = { title: "Test" };

async function TestData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/tests/${id}`);
  const t = await orNotFound(getTestApp(user.id, id));
  if (!t) notFound();
  const mine = t.owner.id === user.id;
  const proofs: Array<[IconName, string]> = [
    ["image", `${t.steps.length} capture${t.steps.length > 1 ? "s" : ""} d’écran, une par étape`],
    ["question", `${t.questions.length} question${t.questions.length > 1 ? "s" : ""} sur ce que vous avez vu`],
    ["message", "Vos remarques, en quelques lignes"],
  ];
  const canTest = !mine && (t.myReport === null || t.myReport === "REFUSED") && t.slotsLeft > 0;
  return (
    <>
      <TopBar back="/tests" plain />
      <Page narrow className="flex-1 pt-0">
        <div className="flex items-center gap-3.5">
          <AppTile app={t} size="lg" />
          <div className="grid gap-0.5">
            <h1 className="font-display text-[26px] leading-[30px] font-bold tracking-[-0.03em]">{t.name}</h1>
            <span className="text-sm text-muted">
              par {t.owner.name} · {t.platform === "WEB" ? "Web" : "Android"} · {t.minutes} min
            </span>
          </div>
        </div>
        <p>{t.pitch}</p>
        {t.myReport === "SUBMITTED" && <Alert tone="info" title="Rapport envoyé.">{t.owner.name.split(" ")[0]} le lit puis le valide.</Alert>}
        {t.myReport === "VALIDATED" && <Alert tone="success" title="Rapport validé.">Ce test compte sur votre profil. Merci !</Alert>}
        {t.myReport === "REFUSED" && <Alert tone="danger" title="Rapport refusé.">Vous pouvez refaire le test et envoyer un nouveau rapport.</Alert>}
        <section className="grid gap-3" aria-labelledby="scenario">
          <Overline as="h2" id="scenario">
            Le scénario
          </Overline>
          <ol className="m-0 grid list-none gap-3 p-0">
            {t.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-text">{i + 1}</span>
                <span className="pt-0.5 text-sm">{s}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="grid gap-2.5 rounded-lg bg-sunken p-4" aria-labelledby="proof">
          <Overline as="h2" id="proof">
            Pour prouver votre passage
          </Overline>
          {proofs.map(([icon, label]) => (
            <p key={label} className="flex items-center gap-2 text-sm">
              <Icon name={icon} size={18} className="text-muted" />
              {label}
            </p>
          ))}
          <p className="text-xs text-muted">Les tests sont gratuits. Le porteur valide chaque rapport.</p>
        </section>
      </Page>
      <ActionBar className="grid-cols-[auto_minmax(0,1fr)]">
        <ButtonLink href={t.url} variant="secondary" icon="external" target="_blank" rel="noreferrer">
          Ouvrir l’app
        </ButtonLink>
        {mine ? (
          <ButtonLink href={`/tests/${t.id}/rapports`}>Voir les rapports</ButtonLink>
        ) : canTest ? (
          <ButtonLink href={`/tests/${t.id}/rapport`}>Commencer le test</ButtonLink>
        ) : (
          <ButtonLink href="/tests" variant="secondary">
            {t.slotsLeft === 0 && !t.myReport ? "Toutes les places sont prises" : "Retour aux tests"}
          </ButtonLink>
        )}
      </ActionBar>
    </>
  );
}

export default function TestPage({ params }: PageProps<"/[locale]/tests/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement du test…</p>}>
      <TestData params={params} />
    </Suspense>
  );
}
