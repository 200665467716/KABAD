"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, Overline } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact } from "@/lib/messaging-types";
import { GROUP_NAME_MAX, GROUP_THEMES } from "@/lib/schemas";

export function NewGroupForm({ contacts }: { contacts: Contact[] }) {
  const t = useTranslations("messaging.group");
  const router = useRouter();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<(typeof GROUP_THEMES)[number] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<{ field: "name" | "members" | "form"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError({ field: "name", text: t("nameRequired") });
    if (chosen.length === 0) return setError({ field: "members", text: t("membersRequired") });
    setError(null);
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("/api/groups", { body: { name, memberIds: chosen, ...(theme ? { theme } : {}) } });
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
              <Avatar initials={<Icon name="users" />} size="lg" square tone="neutral" />
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
                        <Avatar initials={initials(c.name)} size="sm" />
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
