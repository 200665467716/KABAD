import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Conditions et charte de la communauté" };

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/* Draft written from the rules the app enforces; to be reviewed by a lawyer before launch. */
export default function TermsPage() {
  return (
    <main className="mx-auto grid max-w-[720px] gap-6 px-6 py-10 leading-7">
      <Link href="/" aria-label="KABAD, accueil">
        <LogoMark size={40} decorative />
      </Link>
      <h1 className="font-display text-[30px] leading-9 font-bold">Conditions d’utilisation et charte de la communauté</h1>
      <p className="text-sm text-muted">Version de travail du 22 octobre 2026, à faire valider avant l’ouverture au public.</p>

      <Part title="La charte">
        <ul className="grid list-disc gap-1 pl-5">
          <li>On s’adresse aux autres avec respect, quels que soient leur pays, leur langue ou leur niveau.</li>
          <li>Pas de harcèlement, de propos haineux, d’arnaque ni de spam, dans les messages comme dans les salons vocaux.</li>
          <li>Dans un défi, le code soumis est le vôtre. L’aide du mentor porte sur l’apprentissage, pas sur la solution.</li>
          <li>Le statut Senior et les heures de mentorat se déclarent honnêtement : ils ouvrent des récompenses.</li>
        </ul>
      </Part>
      <Part title="Ce que nous faisons en cas de problème">
        <p>Chaque membre peut signaler un profil, un message, une conversation, une invitation ou un salon, et bloquer quelqu’un. L’équipe KABAD examine les signalements : elle peut classer, retirer un message, fermer un salon, avertir ou suspendre un compte. Chaque décision est enregistrée.</p>
      </Part>
      <Part title="Vos données">
        <ul className="grid list-disc gap-1 pl-5">
          <li>Nous gardons ce qui sert au service : votre profil, vos messages, vos binômes, vos solutions et vos rapports de test.</li>
          <li>Les salons vocaux ne sont pas enregistrés.</li>
          <li>Votre numéro Mobile Money n’est utilisé que pour vous verser un gain, et n’est montré qu’à l’équipe.</li>
          <li>Depuis « Mon compte », vous téléchargez toutes vos données et vous supprimez votre compte à tout moment.</li>
        </ul>
      </Part>
      <Part title="Les défis et les cagnottes">
        <p>Une cagnotte est partagée entre le gagnant (60 %), son mentor (30 %) et KABAD (10 %), après la publication des résultats et 48 heures de contestation. Le jury est composé de trois seniors vérifiés ; un juré ne note jamais une personne qu’il accompagne.</p>
      </Part>
      <Link href="/inscription" className="font-bold">
        Retour à l’inscription
      </Link>
    </main>
  );
}
