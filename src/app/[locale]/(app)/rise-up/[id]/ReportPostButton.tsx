"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ReportSheet } from "@/components/features/ReportSheet";
import { useRouter } from "@/i18n/navigation";

/** « Signaler » under a post or a reply of a Rise-Up project; a lead hides it at once with a reason (P5). */
export function ReportPostButton({ postId, lead }: { postId: string; lead: boolean }) {
  const t = useTranslations("rise.project");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Zone tactile de 44 px sans grossir le message : la marge négative rend la hauteur ajoutée. */}
      <button type="button" onClick={() => setOpen(true)} className="-my-3 min-h-11 justify-self-start text-[13px] text-muted underline-offset-2 hover:underline">
        {t("report")}
      </button>
      <ReportSheet open={open} onClose={() => setOpen(false)} subject={t("reportSubject")} target={{ type: "RISE_POST", id: postId }} hides={lead} onSent={() => lead && router.refresh()} />
    </>
  );
}
