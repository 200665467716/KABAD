"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MessageBubble, SystemLine } from "@/components/features/Thread";
import { ReportSheet } from "@/components/features/ReportSheet";
import { TopBar } from "@/components/shell/TopBar";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar, DaySeparator } from "@/components/ui/Display";
import { CURRENT_USER_ID, conversation, member, type Message } from "@/lib/data";
import { initials } from "@/lib/format";

function now() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function ConversationView({ conversationId }: { conversationId: string }) {
  const c = conversation(conversationId)!;
  const group = c.kind === "group";
  const other = group ? null : member(c.memberIds.find((id) => id !== CURRENT_USER_ID)!);
  const [messages, setMessages] = useState<Message[]>(c.messages);
  const [draft, setDraft] = useState("");
  const [report, setReport] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `local-${m.length}`, authorId: CURRENT_USER_ID, text, time: now() }]);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) send(e);
  }

  const memberNames = c.memberIds.map((id) => (id === CURRENT_USER_ID ? "Vous" : member(id).name.split(" ")[0])).join(", ");

  return (
    <div className="flex h-dvh flex-col lg:h-dvh">
      <TopBar
        back="/messages"
        leading={
          group ? (
            <Avatar initials={initials(c.name)} size="sm" square tone="neutral" />
          ) : (
            <Link href={`/profil/${other!.id}`} aria-label={`Profil de ${other!.name}`}>
              <Avatar initials={initials(other!.name)} size="sm" />
            </Link>
          )
        }
        title={<span className="text-lg lg:text-2xl">{c.name}</span>}
        subtitle={group ? memberNames : `${other!.role === "senior" ? "Senior · " : ""}${other!.city}`}
        actions={
          group && c.createdBy === CURRENT_USER_ID ? (
            <IconButton icon="userPlus" label="Ajouter un participant" />
          ) : (
            <IconButton icon="more" label="Signaler la conversation" onClick={() => setReport(true)} />
          )
        }
      />
      <main className="mx-auto grid w-full max-w-[760px] flex-1 content-end gap-3 overflow-y-auto px-4 py-3 lg:px-10" aria-live="polite">
        <DaySeparator>Aujourd’hui</DaySeparator>
        <div className="grid gap-2.5">
          {messages.map((m) => {
            if (m.system) return <SystemLine key={m.id}>{m.text}</SystemLine>;
            const mine = m.authorId === CURRENT_USER_ID;
            if (group && !mine) {
              const a = member(m.authorId);
              return (
                <div key={m.id} className="grid grid-cols-[32px_minmax(0,1fr)] items-end gap-2">
                  <Avatar initials={initials(a.name)} size="sm" />
                  <MessageBubble text={m.text} code={m.code} time={m.time} author={a.name} authorTone={a.id === "chidi" ? "accent" : "brand"} />
                </div>
              );
            }
            return <MessageBubble key={m.id} text={m.text} code={m.code} time={m.time} mine={mine} />;
          })}
        </div>
        <div ref={end} />
      </main>
      <form onSubmit={send} className="sticky bottom-0 border-t border-line bg-raised">
        <div className="mx-auto flex max-w-[760px] items-end gap-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom,0px))] lg:px-10">
          <IconButton icon="code" label="Joindre un fichier ou du code" />
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            aria-label={group ? "Message au groupe" : "Votre message"}
            placeholder={group ? "Message au groupe" : "Votre message"}
            className="max-h-30 min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-line-strong bg-bg px-3 py-2.5 text-base leading-6"
          />
          <Button type="submit" iconOnly icon="send" aria-label="Envoyer" className="rounded-full" disabled={!draft.trim()} />
        </div>
      </form>
      <ReportSheet open={report} onClose={() => setReport(false)} subject="cette conversation" />
    </div>
  );
}
