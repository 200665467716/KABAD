"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageBubble } from "@/components/features/Thread";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, IconButton } from "@/components/ui/Button";
import { Alert, Avatar, Badge } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { InvitationDetail } from "@/lib/messaging-types";
import { shortTime } from "@/lib/time";

export function InvitationView({ invitation }: { invitation: InvitationDetail }) {
  const router = useRouter();
  const from = invitation.from;
  const first = from.name.split(" ")[0];
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const answered = invitation.status !== "PENDING";

  async function answer(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    setError(null);
    try {
      const { conversationId } = await api<{ conversationId: string | null }>(`/api/invitations/${invitation.id}`, { body: { accept } });
      router.replace(accept && conversationId ? `/messages/${conversationId}` : "/messages?onglet=invitations");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La réponse n’est pas partie. Réessayez.");
      setBusy(null);
    }
  }

  return (
    <>
      <TopBar back="/messages?onglet=invitations" title="Invitation" actions={<IconButton icon="flag" label="Signaler cette invitation" onClick={() => setReport(true)} />} />
      <Page narrow className="flex-1 content-start gap-6 pt-7">
        <div className="grid justify-items-center gap-2.5 text-center">
          <Avatar initials={initials(from.name)} size="xl" />
          <div className="grid gap-0.5">
            <h2 className="font-display text-xl font-bold">{from.name}</h2>
            <span className="text-sm text-muted">
              {[from.city && `${from.city}, ${from.country}`, from.stack.join(", "), from.years ? `${from.years} ans` : ""].filter(Boolean).join(" · ")}
            </span>
          </div>
          {from.role === "SENIOR" && <Badge tone="brand">Senior</Badge>}
        </div>
        <MessageBubble text={invitation.message} time={shortTime(invitation.createdAt)} />
        {answered ? (
          <Alert tone="info">Vous avez déjà répondu à cette invitation.</Alert>
        ) : (
          <p className="text-center text-xs text-muted">
            {first} ne peut rien vous envoyer d’autre tant que vous n’avez pas accepté. S’il est refusé, il n’est pas prévenu.
          </p>
        )}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </Page>
      {!answered && (
        <ActionBar className="grid-cols-2">
          <Button variant="secondary" size="lg" onClick={() => answer(false)} disabled={busy !== null}>
            {busy === "decline" ? "Refus…" : "Refuser"}
          </Button>
          <Button size="lg" onClick={() => answer(true)} disabled={busy !== null}>
            {busy === "accept" ? "Ouverture…" : "Accepter"}
          </Button>
        </ActionBar>
      )}
      <ReportSheet
        open={report}
        onClose={() => setReport(false)}
        subject="cette invitation"
        target={{ type: "INVITATION", id: invitation.id }}
        onBlocked={() => {
          router.replace("/messages?onglet=invitations");
          router.refresh();
        }}
      />
    </>
  );
}
