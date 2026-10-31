import { ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge } from "@/components/ui/Display";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { LogoMark } from "@/components/ui/Logo";
import { formatFCFA } from "@/lib/format";

export default function Welcome() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand text-on-brand">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 pt-[max(24px,env(safe-area-inset-top,0px))] lg:px-10">
        <div className="flex items-center gap-2.5 py-2">
          <LogoMark size={40} inverse />
          <span className="flex-1 font-display text-xl font-extrabold tracking-[0.04em]">KABAD</span>
          <LanguageSwitcher compact />
        </div>

        <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-16">
          <div className="order-2 grid gap-3 lg:order-1 lg:gap-6">
            <h1 className="font-display text-[30px] leading-[36px] font-extrabold uppercase lg:text-[56px] lg:leading-[62px]">Les seniors transmettent. Les juniors progressent.</h1>
            <p className="max-w-[56ch] text-[17px] leading-7 opacity-90 lg:text-lg">
              La communauté des développeurs d’Afrique et de la diaspora, pour apprendre en pratiquant et créer des projets à impact.
            </p>
            <div className="mt-4 hidden max-w-sm gap-3 lg:grid">
              <ButtonLink href="/inscription" variant="accent" size="lg" block>
                Créer mon compte
              </ButtonLink>
              <ButtonLink href="/connexion" variant="onBrand" size="lg" block>
                J’ai déjà un compte
              </ButtonLink>
            </div>
          </div>

          <div className="relative order-1 grid min-h-[260px] content-center gap-3 lg:order-2 lg:min-h-[420px]" aria-hidden="true">
            <div className="grid gap-2.5 opacity-90">
              <i className="block h-2.5 w-[46%] rounded-xs bg-on-brand/20" />
              <i className="ml-[12%] block h-2.5 w-[70%] rounded-xs bg-on-brand/20" />
              <i className="ml-[12%] block h-2.5 w-[58%] rounded-xs bg-accent" />
              <i className="ml-[24%] block h-2.5 w-[64%] rounded-xs bg-on-brand/20" />
              <i className="ml-[12%] block h-2.5 w-[38%] rounded-xs bg-on-brand/20" />
            </div>
            <div className="absolute top-[12%] right-0 grid w-[210px] gap-2 rounded-lg bg-raised p-3 text-ink shadow-lg">
              <div className="flex items-center gap-2.5">
                <Avatar initials="AD" size="sm" />
                <span className="grid">
                  <span className="text-sm font-bold">Awa Diop</span>
                  <span className="text-xs text-muted">Senior · Dakar</span>
                </span>
              </div>
              <Badge tone="success">Séance confirmée</Badge>
            </div>
            <div className="absolute bottom-[6%] left-0 grid w-[220px] gap-1.5 rounded-lg bg-raised p-3 text-ink shadow-lg">
              <span className="text-xs font-bold tracking-[0.08em] text-accent-text uppercase">Défi gagné</span>
              <span className="font-display text-xl font-bold tabular">{formatFCFA(150000)}</span>
              <span className="flex h-2 gap-0.5 overflow-hidden rounded-xs">
                <span className="bg-brand" style={{ flex: 60 }} />
                <span className="bg-accent" style={{ flex: 30 }} />
                <span className="bg-subtle" style={{ flex: 10 }} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 px-6 pt-5 pb-[max(28px,env(safe-area-inset-bottom,0px))] lg:hidden">
        <ButtonLink href="/inscription" variant="accent" size="lg" block>
          Créer mon compte
        </ButtonLink>
        <ButtonLink href="/connexion" variant="onBrand" size="lg" block>
          J’ai déjà un compte
        </ButtonLink>
        <p className="text-center text-xs opacity-80">Gratuit. Application web, installable sur votre téléphone.</p>
      </div>
    </div>
  );
}
