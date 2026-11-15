"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { ReceivedInvitation, SentInvitation } from "@/lib/messaging-types";
import { useRealtime } from "@/lib/realtime-client";

type Answered = { accepted: boolean; conversationId: string | null };

export function InvitationsView({ received: initialReceived, sent: initialSent }: { received: ReceivedInvitation[]; sent: SentInvitation[] }) {
  const t = useTranslations("messaging.invitations");
  const router = useRouter();
  const [received, setReceived] = useState(initialReceived);
  const [sent, setSent] = useState(initialSent);
  const [answers, setAnswers] = useState<Record<string, Answered>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The invitation being declined: a refusal is confirmed in a sheet first (MS2).
  const [declining, setDeclining] = useState<ReceivedInvitation | null>(null);
  const [status, setStatus] = useState("");

  const refresh = async () => {
    try {
      const i = await api<{ received: ReceivedInvitation[]; sent: SentInvitation[] }>("/api/invitations");
      setReceived((cur) => [...cur.filter((x) => answers[x.id]), ...i.received.filter((x) => !answers[x.id])]);
      setSent(i.sent);
    } catch {
      // A later event retries.
    }
  };
  useRealtime("invitation:new", refresh);
  useRealtime("invitation:answered", refresh);

  async function answer(id: string, accept: boolean) {
    setBusy(id);
    setError(null);
    try {
      const { conversationId } = await api<{ conversationId: string | null }>(`/api/invitations/${id}`, { body: { accept } });
      setAnswers((a) => ({ ...a, [id]: { accepted: accept, conversationId } }));
      // Comme depuis la page de l'invitation : accepter ouvre la conversation.
      if (accept && conversationId) return router.push(`/messages/${conversationId}`);
      // A declined invitation simply leaves the list; the sender is not told.
      if (!accept) {
        setReceived((list) => list.filter((x) => x.id !== id));
        setDeclining(null);
      }
      setStatus(accept ? t("accepted") : t("declined"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: string) {
    setSent((list) => list.filter((x) => x.id !== id));
    await api(`/api/invitations/${id}`, { method: "DELETE" }).catch(refresh);
  }

  return (
    <>
      <TopBar back="/messages" title={t("title")} />
      <Page narrow>
        <section className="grid gap-2.5" aria-labelledby="received">
          <Overline as="h2" id="received">
            {t("received")}
          </Overline>
          {received.length === 0 ? (
            <p className="text-sm text-muted">{t("noReceived")}</p>
          ) : (
            <>
              <p className="text-[13px] text-muted">{t("intro")}</p>
              {received.map((i) => {
                const done = answers[i.id];
                // Un seul bouton indigo par écran : celui de la première invitation encore sans réponse.
                const first = received.find((x) => !answers[x.id])?.id === i.id;
                return (
                  <article key={i.id} className="grid gap-3 rounded-lg border-2 border-line-strong bg-raised p-3.5">
                    <Link href={`/messages/invitations/${i.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-ink no-underline">
                      <Avatar initials={initials(i.from.name)} src={i.from.photo} verified={i.from.role === "SENIOR"} />
                      <span className="grid min-w-0">
                        <b className="truncate text-[15px]">{i.from.name}</b>
                        <small className="truncate text-[13px] text-muted">{[i.from.headline, i.from.city, i.from.stack.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</small>
                        {/* P8: the presentation, as the sender wrote it on their profile. */}
                        {i.from.bio && <small className="mt-0.5 line-clamp-2 text-[13px] text-ink">{i.from.bio}</small>}
                      </span>
                      <Icon name="chevron" size={18} className="text-subtle" />
                    </Link>
                    {i.message && <p className="rounded-action bg-bg px-3 py-2.5 text-sm">{i.message}</p>}
                    {done?.accepted ? (
                      <div className="flex items-center justify-between gap-3">
                        <Badge tone="success" icon="check">
                          {t("accepted")}
                        </Badge>
                        {done.conversationId && (
                          <ButtonLink href={`/messages/${done.conversationId}`} variant="ink" size="sm" icon="message">
                            {t("write")}
                          </ButtonLink>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" disabled={busy !== null} onClick={() => setDeclining(i)}>
                          {t("decline")}
                        </Button>
                        <Button variant={first ? "primary" : "ink"} disabled={busy !== null} onClick={() => answer(i.id, true)}>
                          {t("accept")}
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </>
          )}
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </section>
        <section className="grid gap-2.5" aria-labelledby="sent">
          <Overline as="h2" id="sent">
            {t("sent")}
          </Overline>
          {sent.length === 0 ? (
            <p className="text-sm text-muted">
              {t("noSent")}{" "}
              <Link href="/membres" className="font-extrabold text-brand-text">
                {t("findMembers")}
              </Link>
            </p>
          ) : (
            <ul className="m-0 list-none overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0 [&>li+li]:border-t-2 [&>li+li]:border-line">
              {sent.map((i) => (
                <li key={i.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3">
                  <Avatar initials={initials(i.to.name)} src={i.to.photo} size="sm" />
                  <span className="grid min-w-0">
                    <Link href={`/profil/${i.toId}`} className="truncate text-[15px] font-extrabold text-ink no-underline">
                      {i.to.name}
                    </Link>
                    <span className="truncate text-[13px] text-muted">{i.message || t("noMessage")}</span>
                  </span>
                  <span className="grid justify-items-end gap-1">
                    <Badge tone="brand">{t("pending")}</Badge>
                    <button type="button" onClick={() => cancel(i.id)} aria-label={t("cancelLabel", { name: i.to.name })} className="min-h-11 text-xs font-extrabold text-muted underline-offset-2 hover:underline">
                      {t("cancel")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p role="status" className="sr-only">
          {status}
        </p>
      </Page>
      <ConfirmSheet
        open={declining !== null}
        onClose={() => setDeclining(null)}
        title={t("declineTitle")}
        text={declining ? t("declineText", { name: declining.from.name.split(" ")[0] }) : ""}
        confirm={t("decline")}
        busy={busy !== null}
        onConfirm={() => declining && answer(declining.id, false)}
      />
    </>
  );
}
