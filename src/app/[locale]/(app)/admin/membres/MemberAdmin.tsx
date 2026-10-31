"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

type Row = {
  id: string;
  name: string;
  email: string;
  role: "JUNIOR" | "SENIOR";
  place: string;
  years: number;
  profileLink: string;
  isAdmin: boolean;
  emailVerified: boolean;
  seniorVerified: boolean;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
  reportsReceived: number;
};

function MemberRow({ m, meId }: { m: Row; meId: string }) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const router = useRouter();
  const [mode, setMode] = useState<"revoke" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/members/${m.id}`, { body });
      setMode(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/profil/${m.id}`} className="font-extrabold text-ink">
          {m.name}
        </Link>
        {m.isAdmin && <Badge tone="brand">{t("members.team")}</Badge>}
        {m.seniorVerified && <Badge tone="success">{t("members.mentor")}</Badge>}
        {!m.emailVerified && <Badge>{t("members.emailUnverified")}</Badge>}
        {m.suspended && <Badge tone="danger">{t("members.suspended")}</Badge>}
        {m.reportsReceived > 0 && <Badge tone="danger">{t("members.reports", { count: m.reportsReceived })}</Badge>}
      </div>
      <p className="text-sm text-muted">{t("members.meta", { email: m.email, place: m.place || t("members.noPlace"), date: format.dateTime(new Date(m.createdAt), { day: "numeric", month: "short", year: "numeric" }) })}</p>
      {m.profileLink && (
        <a href={`https://${m.profileLink}`} target="_blank" rel="noreferrer" className="text-sm font-extrabold">
          {t("members.profile", { link: m.profileLink })}
        </a>
      )}
      {m.suspended && m.suspensionReason && <p className="text-sm">{t("members.reason", { reason: m.suspensionReason })}</p>}
      {mode && <TextField id={`reason-${m.id}`} label={mode === "suspend" ? t("members.suspendLabel") : t("members.revokeLabel")} value={reason} maxLength={250} onChange={(e) => setReason(e.target.value)} />}
      {m.id !== meId && !m.isAdmin && (
        <div className="flex flex-wrap gap-2">
          {mode ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={busy}>
                {t("members.cancel")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => act({ action: mode, reason })} disabled={busy}>
                {mode === "suspend" ? t("members.confirmSuspend") : t("members.confirmRevoke")}
              </Button>
            </>
          ) : (
            <>
              {m.seniorVerified && (
                <Button size="sm" variant="secondary" onClick={() => setMode("revoke")} disabled={busy}>
                  {t("members.revoke")}
                </Button>
              )}
              {m.suspended ? (
                <Button size="sm" variant="secondary" onClick={() => act({ action: "reinstate" })} disabled={busy}>
                  {t("members.reinstate")}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setMode("suspend")} disabled={busy}>
                  {t("members.suspend")}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function MemberAdmin({ members, meId }: { members: Row[]; meId: string }) {
  const t = useTranslations("admin.members");
  if (members.length === 0) return <p className="py-8 text-center text-muted">{t("empty")}</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {members.map((m) => (
        <MemberRow key={m.id} m={m} meId={meId} />
      ))}
    </div>
  );
}
