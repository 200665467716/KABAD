import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-[480px] content-center justify-items-start gap-4 px-6 py-12">
      <LogoMark size={48} decorative />
      <h1 className="font-display text-[28px] leading-8 font-bold">Page introuvable</h1>
      <p className="text-muted">Cette page n’existe pas, ou vous n’y avez pas accès. Le lien est peut-être incomplet.</p>
      <ButtonLink href="/accueil">Retour à l’accueil</ButtonLink>
    </main>
  );
}
