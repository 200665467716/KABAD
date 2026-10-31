"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Overline } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact } from "@/lib/messaging-types";
import { GROUP_NAME_MAX } from "@/lib/schemas";

export function NewGroupForm({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<{ field: "name" | "members" | "form"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError({ field: "name", text: "Donnez un nom au groupe." });
    if (chosen.length === 0) return setError({ field: "members", text: "Choisissez au moins un participant." });
    setError(null);
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("/api/groups", { body: { name, memberIds: chosen } });
      router.replace(`/messages/${id}`);
    } catch (err) {
      setError({ field: "form", text: err instanceof ApiError ? err.message : "Le groupe n’a pas été créé. Réessayez." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/messages" close title="Nouveau groupe" />
      <Page narrow className="flex-1">
        {contacts.length === 0 ? (
          <div className="grid justify-items-start gap-3">
            <p className="text-muted">Un groupe se crée avec vos contacts. Invitez d’abord des membres : ils deviennent vos contacts quand ils acceptent.</p>
            <ButtonLink href="/membres" variant="secondary">
              Trouver des membres
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <Avatar initials={<Icon name="users" />} size="lg" square tone="neutral" />
              <TextField
                id="name"
                name="name"
                label="Nom du groupe"
                placeholder="Par exemple : API Lomé"
                maxLength={GROUP_NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
                error={error?.field === "name" ? error.text : undefined}
              />
            </div>
            <section className="grid gap-2" aria-labelledby="chosen">
              <div className="flex items-baseline justify-between">
                <h2 id="chosen" className="text-sm font-bold">
                  Participants
                </h2>
                <span className="text-xs text-muted tabular" aria-live="polite">
                  {chosen.length} choisi{chosen.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex min-h-6 flex-wrap gap-1.5">
                {chosen.map((id) => (
                  <Badge key={id} tone="brand">
                    {contacts.find((c) => c.id === id)?.name}
                  </Badge>
                ))}
              </div>
              {error?.field === "members" && <span className="text-sm font-bold text-danger">{error.text}</span>}
            </section>
            <section className="grid gap-2" aria-labelledby="contacts">
              <Overline as="h2" id="contacts">
                Vos contacts
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
                            {c.role === "SENIOR" ? " · Senior" : c.stack.length ? ` · ${c.stack.slice(0, 2).join(", ")}` : ""}
                          </span>
                        </span>
                        <input type="checkbox" checked={on} onChange={() => setChosen((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))} className="size-5.5 accent-[var(--brand)]" aria-label={`Ajouter ${c.name}`} />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <Icon name="lock" size={16} className="mt-px" />
              Groupe privé : vous seul pouvez ajouter des participants, choisis parmi vos contacts.
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
            {busy ? "Création…" : "Créer le groupe"}
          </Button>
        </ActionBar>
      )}
    </form>
  );
}
