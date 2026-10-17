import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppTile } from "@/components/features/AppTile";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Overline } from "@/components/ui/Display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { member, test, tests } from "@/lib/data";

export function generateStaticParams() {
  return tests.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/tests/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: test(id)?.name ?? "Test" };
}

export default async function TestPage({ params }: PageProps<"/tests/[id]">) {
  const { id } = await params;
  const t = test(id);
  if (!t) notFound();
  const owner = member(t.ownerId);
  const proofs: Array<[IconName, string]> = [
    ["image", `${t.steps.length} captures d’écran, une par étape`],
    ["question", `${t.questions.length} question${t.questions.length > 1 ? "s" : ""} sur ce que vous avez vu`],
    ["message", "Vos remarques, en quelques lignes"],
  ];
  return (
    <>
      <TopBar back="/tests" plain />
      <Page narrow className="flex-1 pt-0">
        <div className="flex items-center gap-3.5">
          <AppTile app={t} size="lg" />
          <div className="grid gap-0.5">
            <h1 className="font-display text-[26px] leading-[30px] font-bold tracking-[-0.03em]">{t.name}</h1>
            <span className="text-sm text-muted">
              par {owner.name} · {t.platform} · {t.minutes} min
            </span>
          </div>
        </div>
        <p>{t.pitch}</p>
        <section className="grid gap-3" aria-labelledby="scenario">
          <Overline as="h2" id="scenario">
            Le scénario
          </Overline>
          <ol className="m-0 grid list-none gap-3 p-0">
            {t.steps.map((s, i) => (
              <li key={s} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3">
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
        <ButtonLink href="#" variant="secondary" icon="external">
          Ouvrir l’app
        </ButtonLink>
        <ButtonLink href={`/tests/${t.id}/rapport`}>Commencer le test</ButtonLink>
      </ActionBar>
    </>
  );
}
