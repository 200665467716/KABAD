"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { GROUP_PHOTO_SIZE } from "@/lib/attachments";
import { initials } from "@/lib/format";
import { squareImage } from "@/lib/image-resize";

/**
 * The member's profile photo: sent as soon as it is chosen, apart from the rest of the form.
 * The browser crops it to a square and reduces it first, so a few dozen Ko travel on a slow connection.
 */
export function ProfilePhoto({ name, initial }: { name: string; initial: string | null }) {
  const t = useTranslations("profile.edit");
  const router = useRouter();
  const [photo, setPhoto] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function run(call: () => Promise<{ photo: string | null }>) {
    setBusy(true);
    setError(null);
    try {
      setPhoto((await call()).photo);
      // The profile screen and the messaging read the photo from the server.
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("photoFailed"));
    } finally {
      setBusy(false);
    }
  }

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    run(async () => {
      const form = new FormData();
      form.append("photo", await squareImage(chosen, GROUP_PHOTO_SIZE).catch(() => chosen), "photo");
      return api<{ photo: string | null }>("/api/me/photo", { method: "PUT", body: form });
    });
  }

  return (
    <section aria-label={t("photo")} className="grid gap-2">
      <div className="flex items-center gap-3.5">
        <Avatar initials={initials(name)} src={photo} size="xl" tone="accent" />
        <div className="flex flex-wrap gap-2">
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
          <Button variant="secondary" size="sm" icon="image" disabled={busy} onClick={() => file.current?.click()}>
            {busy ? t("photoSending") : photo ? t("photoChange") : t("photoAdd")}
          </Button>
          {photo && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api<{ photo: string | null }>("/api/me/photo", { method: "DELETE" }))}>
              {t("photoRemove")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-[13px] leading-[18px] text-muted">{t("photoHint")}</p>
      {error && (
        <p role="alert" className="text-[13px] font-bold text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
