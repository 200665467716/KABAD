"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

type Translate = (message: string) => string;
const same: Translate = (message) => message;

/**
 * Les messages de src/lib/schemas.ts sont en français. Un formulaire qui valide avant l'envoi
 * les affiche dans la langue de la page, avec la même table que l'API (src/server/error-messages.en.json).
 * La table n'est chargée que sous /en : le français ne paie rien.
 */
export function useErrorText(): Translate {
  const locale = useLocale();
  const [translate, setTranslate] = useState<Translate>(() => same);
  useEffect(() => {
    if (locale !== "en") return;
    let live = true;
    void import("@/server/error-language").then(({ translateError }) => {
      if (live) setTranslate(() => (message: string) => translateError(message, "en"));
    });
    return () => {
      live = false;
    };
  }, [locale]);
  return locale === "en" ? translate : same;
}
