"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";

/**
 * H4: opens the team's discussion in the messaging. A team created before discussions existed
 * has none yet: the server opens it at the first click.
 */
export function TeamDiscussionButton({ teamId, conversationId, label }: { teamId: string; conversationId: string | null; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (conversationId) return <IconButton icon="message" label={label} href={`/messages/${conversationId}`} />;
  return (
    <IconButton
      icon="message"
      label={label}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api<{ conversationId: string }>(`/api/teams/${teamId}/discussion`, { method: "POST" });
          router.push(`/messages/${r.conversationId}`);
        } catch {
          setBusy(false);
        }
      }}
    />
  );
}
