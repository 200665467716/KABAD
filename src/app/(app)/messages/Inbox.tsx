"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Avatar, CardLink, PersonRow } from "@/components/ui/Display";
import { conversations, member } from "@/lib/data";
import { initials } from "@/lib/format";
import { useInvitations } from "@/lib/use-invitations";

export function Inbox() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("onglet") === "invitations" ? "inv" : "conv";
  const { pending, accepted } = useInvitations();

  const acceptedConvs = accepted.map((id) => {
    const m = member(id);
    return { id: `nouveau-${id}`, name: m.name, initials: initials(m.name), group: false, last: "Invitation acceptée. Dites bonjour !", when: "À l’instant", unread: 0, href: `/messages/invitations/${id}` };
  });
  const rows = [
    ...acceptedConvs,
    ...conversations.map((c) => {
      const last = [...c.messages].reverse().find((m) => !m.system)!;
      const author = last.authorId === "kossi" ? "Vous" : member(last.authorId).name.split(" ")[0];
      return {
        id: c.id,
        name: c.kind === "group" ? `Groupe ${c.name}` : c.name,
        initials: c.kind === "group" ? initials(c.name) : initials(c.name),
        group: c.kind === "group",
        last: c.kind === "group" || last.authorId === "kossi" ? `${author} : ${last.text}` : last.text,
        when: c.when,
        unread: c.unread,
        href: `/messages/${c.id}`,
      };
    }),
  ];

  return (
    <>
      <TopBar
        title="Messages"
        actions={
          <ButtonLink href="/messages/groupes/nouveau" size="sm" variant="secondary" icon="userPlus">
            Groupe
          </ButtonLink>
        }
      >
        <Segmented
          label="Messages"
          stretch
          className="lg:inline-grid lg:min-w-[360px]"
          value={tab}
          onChange={(v) => router.replace(v === "inv" ? "/messages?onglet=invitations" : "/messages", { scroll: false })}
          items={[
            { value: "conv", label: "Discussions" },
            { value: "inv", label: "Invitations", count: pending.length },
          ]}
        />
      </TopBar>
      <Page narrow>
        {tab === "conv" ? (
          <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={r.href} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-sunken/50">
                  <Avatar initials={r.initials} square={r.group} tone={r.group ? "neutral" : "brand"} />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="font-bold">{r.name}</span>
                    <span className="truncate text-sm text-muted">{r.last}</span>
                  </span>
                  <span className="grid justify-items-end gap-1">
                    <span className="text-xs text-subtle tabular">{r.when}</span>
                    {r.unread > 0 && <span className="h-5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 text-on-brand tabular">{r.unread}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : pending.length === 0 ? (
          <p className="py-10 text-center text-muted">Aucune invitation en attente.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Lisez le premier message. La conversation s’ouvre si vous acceptez.</p>
            {pending.map((i) => {
              const m = member(i.fromId);
              return (
                <CardLink key={i.id} href={`/messages/invitations/${i.id}`} className="gap-2.5">
                  <PersonRow avatar={<Avatar initials={initials(m.name)} />} name={m.name} meta={`${m.city} · ${m.stack.join(", ")}`} />
                  <p className="rounded-md bg-sunken px-3 py-2.5 text-sm">{i.message}</p>
                </CardLink>
              );
            })}
          </>
        )}
      </Page>
    </>
  );
}
