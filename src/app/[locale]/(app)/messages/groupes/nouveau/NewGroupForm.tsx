"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, Overline } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { GROUP_PHOTO_MAX_BYTES, GROUP_PHOTO_SIZE } from "@/lib/attachments";
import { initials } from "@/lib/format";
import { squareImage } from "@/lib/image-resize";
import type { Contact } from "@/lib/messaging-types";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX, GROUP_THEMES } from "@/lib/schemas";

export function NewGroupForm({ contacts }: { contacts: Contact[] }) {
  const t = useTranslations("messaging.group");
  const router = useRouter();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<(typeof GROUP_THEMES)[number] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  // The photo, already cropped and reduced in the browser; sent once the group exists.
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<{ field: "name" | "members" | "photo" | "form"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const chosenFile = e.target.files?.[0];
    e.target.value = "";
    if (!chosenFile) return;
    const small = await squareImage(chosenFile, GROUP_PHOTO_SIZE).catch(() => chosenFile);
    if (small.size > GROUP_PHOTO_MAX_BYTES) return setError({ field: "photo", text: t("photoTooBig") });
    setError(null);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError({ field: "name", text: t("nameRequired") });
    if (chosen.length === 0) return setError({ field: "members", text: t("membersRequired") });
    setError(null);
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("/api/groups", { body: { name, memberIds: chosen, ...(theme ? { theme } : {}), ...(description.trim() ? { description } : {}) } });
      // The group exists: its photo follows. A photo that fails does not lose the group.
      if (photo) {
        const form = new FormData();
        form.append("photo", photo, "photo");
        await api(`/api/groups/${id}/photo`, { method: "PUT", body: form }).catch(() => {});
      }
      router.replace(`/messages/${id}`);
    } catch (err) {
      setError({ field: "form", text: err instanceof ApiError ? err.message : t("error") });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/messages" close title={t("title")} />
      <Page narrow className="flex-1">
        {contacts.length === 0 ? (
          <div className="grid justify-items-start gap-3">
            <p className="text-muted">{t("noContacts")}</p>
            <ButtonLink href="/membres" variant="secondary">
              {t("findMembers")}
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pickPhoto} />
              {/* A tap on the square picks the group's photo. */}
              <button type="button" onClick={() => file.current?.click()} aria-label={photo ? t("photoChange") : t("photoAdd")} className="relative shrink-0 rounded-lg">
                <Avatar initials={<Icon name="image" />} src={preview} size="lg" square tone="neutral" />
                <span aria-hidden="true" className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border-2 border-raised bg-ink text-raised">
                  <Icon name="plus" size={16} className="size-3.5" />
                </span>
              </button>
              <TextField
                id="name"
                name="name"
                label={t("name")}
                placeholder={t("namePlaceholder")}
                maxLength={GROUP_NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
                error={error?.field === "name" ? error.text : undefined}
              />
            </div>
            {error?.field === "photo" && <p className="text-sm font-extrabold text-danger">{error.text}</p>}
            <TextArea
              id="description"
              label={t("description")}
              hint={t("descriptionHint")}
              rows={3}
              maxLength={GROUP_DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              counter={`${description.length} / ${GROUP_DESCRIPTION_MAX}`}
            />
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-extrabold">{t("theme")}</legend>
              <div className="flex flex-wrap gap-2">
                {GROUP_THEMES.map((th, i) => (
                  <ToggleChip key={th} pressed={theme === th} onClick={() => setTheme(theme === th ? null : th)}>
                    {t(`themes.t${i}` as "themes.t0")}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
            <section className="grid gap-2" aria-labelledby="chosen">
              <div className="flex items-baseline justify-between">
                <h2 id="chosen" className="text-sm font-extrabold">
                  {t("members")}
                </h2>
                <span className="text-xs text-muted tabular" aria-live="polite">
                  {t("chosen", { count: chosen.length + 1 })}
                </span>
              </div>
              <div className="flex min-h-6 flex-wrap gap-1.5">
                {chosen.map((id) => (
                  <Badge key={id} tone="brand">
                    {contacts.find((c) => c.id === id)?.name}
                  </Badge>
                ))}
              </div>
              {error?.field === "members" && <span className="text-sm font-extrabold text-danger">{error.text}</span>}
            </section>
            <section className="grid gap-2" aria-labelledby="contacts">
              <Overline as="h2" id="contacts">
                {t("contacts")}
              </Overline>
              <ul className="m-0 list-none divide-y divide-line rounded-lg border-2 border-line-strong bg-raised p-0">
                {contacts.map((c) => {
                  const on = chosen.includes(c.id);
                  return (
                    <li key={c.id}>
                      <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                        <Avatar initials={initials(c.name)} src={c.photo} size="sm" />
                        <span className="grid">
                          <span className="text-sm font-bold">{c.name}</span>
                          <span className="text-xs text-muted">
                            {c.city}
                            {c.role === "SENIOR" ? ` · ${t("mentor")}` : c.stack.length ? ` · ${c.stack.slice(0, 2).join(", ")}` : ""}
                          </span>
                        </span>
                        <input type="checkbox" checked={on} onChange={() => setChosen((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))} className="size-5.5 accent-[var(--brand)]" aria-label={t("addLabel", { name: c.name })} />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <Icon name="lock" size={16} className="mt-px" />
              {t("privateNote")}
            </p>
            {error?.field === "form" && (
              <Alert tone="danger" role="alert">
                {error.text}
              </Alert>
            )}
          </>
        )}
      </Page>
      {contacts.length > 0 && (
        <ActionBar>
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? t("submitting") : t("submit")}
          </Button>
        </ActionBar>
      )}
    </form>
  );
}
