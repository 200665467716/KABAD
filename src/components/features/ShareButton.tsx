"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { IconButton } from "@/components/ui/Button";

/** Uses the phone's share sheet when there is one, otherwise copies the link. */
export function ShareButton({ path, label, title }: { path: string; label: string; title: string }) {
  const t = useTranslations("messaging.share");
  const [copied, setCopied] = useState(false);
  return (
    <>
      <IconButton
        icon={copied ? "check" : "share"}
        label={copied ? t("copied") : label}
        onClick={async () => {
          const url = new URL(path, window.location.origin).toString();
          try {
            if (navigator.share) await navigator.share({ title, url });
            else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          } catch {
            // The member closed the share sheet.
          }
        }}
      />
      <span className="sr-only" aria-live="polite">
        {copied ? t("copied") : ""}
      </span>
    </>
  );
}
