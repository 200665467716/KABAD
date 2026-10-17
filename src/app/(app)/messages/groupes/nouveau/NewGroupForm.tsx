"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Avatar, Badge, Overline } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { member } from "@/lib/data";
import { initials } from "@/lib/format";

/** Contacts are the members whose invitation was accepted, either way. */
const CONTACTS = ["yao", "chidi", "awa", "moussa", "fatou"];

export function NewGroupForm() {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(["yao", "chidi"]);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) return setError("Donnez un nom au groupe.");
    if (chosen.length === 0) return setError("Choisissez au moins un participant.");
    router.push("/messages/api-lome");
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/messages" close title="Nouveau groupe" />
      <Page narrow className="flex-1">
        <div className="flex items-end gap-3">
          <Avatar initials={<Icon name="users" />} size="lg" square tone="neutral" />
          <TextField id="name" name="name" label="Nom du groupe" defaultValue="API Lomé" className="flex-1" error={error && error.includes("nom") ? error : undefined} />
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
                {member(id).name}
              </Badge>
            ))}
          </div>
          {error && !error.includes("nom") && <span className="text-sm font-bold text-danger">{error}</span>}
        </section>
        <section className="grid gap-2" aria-labelledby="contacts">
          <Overline as="h2" id="contacts">
            Vos contacts
          </Overline>
          <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
            {CONTACTS.map((id) => {
              const m = member(id);
              const on = chosen.includes(id);
              return (
                <li key={id}>
                  <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                    <Avatar initials={initials(m.name)} size="sm" />
                    <span className="grid">
                      <span className="text-sm font-bold">{m.name}</span>
                      <span className="text-xs text-muted">
                        {m.city} · {m.role === "senior" ? "Senior" : m.stack.slice(0, 2).join(", ")}
                      </span>
                    </span>
                    <input type="checkbox" checked={on} onChange={() => setChosen((c) => (on ? c.filter((x) => x !== id) : [...c, id]))} className="size-5.5 accent-[var(--brand)]" aria-label={`Ajouter ${m.name}`} />
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
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block>
          Créer le groupe
        </Button>
      </ActionBar>
    </form>
  );
}
