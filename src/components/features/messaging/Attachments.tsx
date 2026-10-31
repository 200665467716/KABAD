"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatSize, VOICE_MAX_SECONDS } from "@/lib/attachments";
import type { ChatAttachment } from "@/lib/messaging-types";
import { Icon } from "../../ui/Icon";

const url = (a: ChatAttachment) => `/api/attachments/${a.id}`;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** The same bars for the same note: drawn from its id, not from the sound, so nothing has to be decoded. */
const bars = (seed: string) => Array.from({ length: 24 }, (_, i) => 6 + ((seed.charCodeAt(i % seed.length) * (i + 7)) % 15));

/** A file or a voice note inside a message bubble. */
export function AttachmentView({ attachment, mine }: { attachment: ChatAttachment; mine?: boolean }) {
  const t = useTranslations("messaging.attachments");
  const locale = useLocale();
  if (attachment.kind === "VOICE") return <VoiceNote attachment={attachment} />;
  if (attachment.mime.startsWith("image/")) {
    return (
      // A plain <a>: next-intl's Link would add /en in front of the API address.
      <a href={url(attachment)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- private file behind a session, not optimisable */}
        <img src={url(attachment)} alt={attachment.name} loading="lazy" className="max-h-60 w-full object-cover" />
      </a>
    );
  }
  return (
    <a href={url(attachment)} download={attachment.name} className={cn("flex min-h-12 items-center gap-2.5 rounded-md px-2 py-1.5 no-underline", mine ? "bg-on-brand/15 text-on-brand" : "bg-bg text-ink")}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-sm text-[11px] font-extrabold", mine ? "bg-on-brand text-brand" : "bg-ink text-raised")}>{attachment.mime === "application/pdf" ? "PDF" : <Icon name="file" size={18} />}</span>
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-extrabold">{attachment.name}</span>
        <span className="text-xs opacity-80">{formatSize(attachment.size, locale)}</span>
      </span>
      <Icon name="download" size={18} label={t("download")} />
    </a>
  );
}

function VoiceNote({ attachment }: { attachment: ChatAttachment }) {
  const t = useTranslations("messaging.attachments");
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const total = attachment.seconds ?? 0;
  const progress = total ? at / total : 0;
  return (
    <div className="flex min-w-[200px] items-center gap-2">
      <button
        type="button"
        aria-label={playing ? t("pause") : t("play")}
        onClick={() => (playing ? audio.current?.pause() : audio.current?.play())}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-current/15"
      >
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
      <span className="flex h-6 flex-1 items-center gap-0.5" aria-hidden="true">
        {bars(attachment.id).map((h, i, all) => (
          <i key={i} className={cn("block w-[3px] rounded-full bg-current", i / all.length > progress && "opacity-40")} style={{ height: h }} />
        ))}
      </span>
      <span className="text-xs font-bold tabular">{clock(playing ? at : total)}</span>
      <audio
        ref={audio}
        src={url(attachment)}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setAt(0);
        }}
        onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
      />
    </div>
  );
}

/** The paper clip of the composer: picks a PDF or an image. */
export function AttachButton({ onPick, disabled }: { onPick: (file: File) => void; disabled?: boolean }) {
  const t = useTranslations("messaging.attachments");
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} aria-label={t("attach")} className="inline-grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-bg disabled:opacity-40">
        <Icon name="paperclip" />
      </button>
      <input
        ref={input}
        type="file"
        hidden
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
    </>
  );
}

/** Records a voice note with the browser's microphone: tap to start, tap to send. 2 minutes at most. */
export function VoiceRecorder({ onRecorded, onError, disabled }: { onRecorded: (file: File, seconds: number) => void; onError: (message: string) => void; disabled?: boolean }) {
  const t = useTranslations("messaging.attachments");
  const recorder = useRef<MediaRecorder | null>(null);
  const started = useRef(0);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (seconds === null) return;
    const timer = setInterval(() => {
      const s = (Date.now() - started.current) / 1000;
      setSeconds(s);
      if (s >= VOICE_MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [seconds === null]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return onError(t("unsupported"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32_000 } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const length = Math.round((Date.now() - started.current) / 1000);
        setSeconds(null);
        if (length < 1) return;
        const mime = rec.mimeType || "audio/webm";
        onRecorded(new File(chunks, `note-vocale.${mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"}`, { type: mime }), Math.min(length, VOICE_MAX_SECONDS));
      };
      recorder.current = rec;
      started.current = Date.now();
      rec.start();
      setSeconds(0);
    } catch {
      onError(t("micDenied"));
    }
  }

  const recording = seconds !== null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (recording ? recorder.current?.stop() : start())}
      aria-label={recording ? t("stop") : t("record")}
      className={cn("inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-2.5 disabled:opacity-40", recording ? "bg-danger text-on-danger" : "text-ink hover:bg-bg")}
    >
      <Icon name={recording ? "stop" : "mic"} size={20} />
      {recording && <span className="text-sm font-extrabold tabular">{clock(seconds)}</span>}
    </button>
  );
}
