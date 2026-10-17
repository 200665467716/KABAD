"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageBubble } from "@/components/features/Thread";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge } from "@/components/ui/Display";
import { IconButton } from "@/components/ui/Button";
import { invitations, member } from "@/lib/data";
import { initials } from "@/lib/format";
import { useInvitations } from "@/lib/use-invitations";

export function InvitationView({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const inv = invitations.find((i) => i.id === invitationId)!;
  const m = member(inv.fromId);
  const first = m.name.split(" ")[0];
  const { accepted, accept, decline } = useInvitations();
  const isAccepted = accepted.includes(inv.id);
  const [report, setReport] = useState(false);
  const [reply, setReply] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  return (
    <>
      <TopBar back="/messages?onglet=invitations" title={isAccepted ? m.name : "Invitation"} actions={<IconButton icon="flag" label="Signaler" onClick={() => setReport(true)} />} />
      <Page narrow className="flex-1 content-start gap-6 pt-7">
        <div className="grid justify-items-center gap-2.5 text-center">
          <Avatar initials={initials(m.name)} size="xl" />
          <div className="grid gap-0.5">
            <h2 className="font-display text-xl font-bold">{m.name}</h2>
            <span className="text-sm text-muted">
              {m.city}, {m.country} · {m.stack.join(", ")} · {m.years} ans
            </span>
          </div>
          <div className="flex gap-1.5">
            {inv.stats.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <MessageBubble text={inv.message} time={inv.at} />
          {reply.map((r, i) => (
            <MessageBubble key={i} text={r} time="À l’instant" mine />
          ))}
        </div>
        <div aria-live="polite">
          {isAccepted ? (
            <Alert tone="success" title="Invitation acceptée.">
              {first} fait maintenant partie de vos contacts.
            </Alert>
          ) : (
            <p className="text-center text-xs text-muted">
              {first} ne peut rien vous envoyer d’autre tant que vous n’avez pas accepté. S’il est refusé, il n’est pas prévenu.
            </p>
          )}
        </div>
      </Page>
      <ActionBar className={isAccepted ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-2"}>
        {isAccepted ? (
          <>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Répondre à ${first}`} placeholder={`Répondre à ${first}`} className="h-11 min-w-0 rounded-full border border-line-strong bg-bg px-4 text-base" />
            <Button
              iconOnly
              icon="send"
              aria-label="Envoyer"
              className="rounded-full"
              onClick={() => {
                if (!draft.trim()) return;
                setReply((r) => [...r, draft.trim()]);
                setDraft("");
              }}
            />
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                decline(inv.id);
                router.push("/messages?onglet=invitations");
              }}
            >
              Refuser
            </Button>
            <Button size="lg" onClick={() => accept(inv.id)}>
              Accepter
            </Button>
          </>
        )}
      </ActionBar>
      <ReportSheet open={report} onClose={() => setReport(false)} subject="cette invitation" />
    </>
  );
}
