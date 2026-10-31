import { notFound } from "next/navigation";

/** Toute adresse inconnue affiche la page introuvable dans la bonne langue. */
export default function Unknown() {
  notFound();
}
