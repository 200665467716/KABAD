"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/use-me";

/** Until the e-mail is confirmed the member can read but not contact anyone: say so, and offer a new link. */
export function VerifyBanner() {
  const { me } = useMe();
  const [state, setState] = useState<"idle" | "sent" | string>("idle");
  if (!me || me.emailVerified) return null;
  return (
    <div role="status" className="border-b border-line bg-accent-soft px-4 py-2.5 text-sm text-ink">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex-1">Confirmez votre adresse e-mail pour inviter des membres et leur écrire.</span>
        {state === "sent" ? (
          <span className="font-bold">E-mail envoyé.</span>
        ) : (
          <button
            type="button"
            className="font-bold text-brand-text underline"
            onClick={() =>
              api("/api/auth/verify/resend", { method: "POST" })
                .then(() => setState("sent"))
                .catch((e) => setState(e instanceof ApiError ? e.message : "Envoi impossible."))
            }
          >
            Renvoyer l’e-mail
          </button>
        )}
        {state !== "idle" && state !== "sent" && <span className="w-full text-danger">{state}</span>}
        <Link href="/compte" className="sr-only">
          Mon compte
        </Link>
      </div>
    </div>
  );
}
