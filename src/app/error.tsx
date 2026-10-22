"use client";

import { Button, ButtonLink } from "@/components/ui/Button";

/** Shown when a screen fails unexpectedly. The member can retry without losing the rest of the app. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-[480px] content-center justify-items-start gap-4 px-6 py-12">
      <h1 className="font-display text-[28px] leading-8 font-bold">Une erreur est survenue</h1>
      <p className="text-muted">Ce n’est pas de votre faute. Réessayez dans un instant ; si cela continue, prévenez l’équipe KABAD.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <ButtonLink href="/accueil" variant="secondary">
          Accueil
        </ButtonLink>
      </div>
    </main>
  );
}
