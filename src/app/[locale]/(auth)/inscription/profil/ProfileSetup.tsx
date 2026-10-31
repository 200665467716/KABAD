"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { Checkbox, RadioCard, Select, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { COUNTRIES, STACK_CHOICES } from "@/lib/schemas";

type Initial = { role: "JUNIOR" | "SENIOR"; country: string; city: string; diaspora: boolean; stack: string[]; profileLink: string; headline: string; bio: string; years: number; mentorCapacity: number; verified: boolean };

export function ProfileSetup({ initial, editing, profileHref }: { initial: Initial; editing: boolean; profileHref: string }) {
  const router = useRouter();
  const [role, setRole] = useState(initial.role);
  const [stack, setStack] = useState<string[]>(initial.stack);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const toggle = (s: string) => setStack((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const choices = [...new Set([...STACK_CHOICES, ...initial.stack])];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: {
          role,
          country: String(data.get("country") ?? ""),
          city: String(data.get("city") ?? ""),
          diaspora: data.get("diaspora") === "on",
          stack,
          profileLink: String(data.get("link") ?? ""),
          headline: String(data.get("headline") ?? ""),
          bio: String(data.get("bio") ?? ""),
          years: Number(data.get("years") || 0),
          ...(role === "SENIOR" ? { mentorCapacity: Number(data.get("capacity") ?? 1) } : {}),
        },
      });
      router.push(editing ? profileHref : "/inscription/recommandations");
      router.refresh();
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "Le profil n’a pas été enregistré. Réessayez." });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back={editing ? profileHref : "/inscription"}
        step={editing ? undefined : 2}
        title={editing ? "Modifier mon profil" : "Comment voulez-vous participer ?"}
        lead={editing ? undefined : "Vous pourrez changer plus tard. Un senior peut aussi apprendre."}
        footer={
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? "Enregistrement…" : editing ? "Enregistrer" : "Continuer"}
          </Button>
        }
      >
        <fieldset className="grid gap-2">
          <legend className="sr-only">Votre rôle</legend>
          <RadioCard name="role" value="JUNIOR" checked={role === "JUNIOR"} onChange={() => setRole("JUNIOR")} heading="J’apprends" description="Junior : je cherche un mentor et des défis." />
          <RadioCard name="role" value="SENIOR" checked={role === "SENIOR"} onChange={() => setRole("SENIOR")} heading="Je transmets" description="Senior : 5 ans d’expérience ou plus. Statut vérifié par l’équipe KABAD." />
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Select id="country" name="country" label="Pays" defaultValue={initial.country || "Togo"}>
            {[...new Set([...COUNTRIES, ...(initial.country ? [initial.country] : [])])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <TextField id="city" name="city" label="Ville" defaultValue={initial.city} autoComplete="address-level2" error={fieldError("city")} />
        </div>
        <Checkbox name="diaspora" defaultChecked={initial.diaspora}>
          Je vis hors d’Afrique (diaspora)
        </Checkbox>
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
          <TextField id="headline" name="headline" label="Titre (facultatif)" placeholder="Développeur Node.js" defaultValue={initial.headline} maxLength={80} />
          <TextField id="years" name="years" type="number" inputMode="numeric" min={0} max={50} label="Années d’exp." defaultValue={String(initial.years || "")} error={fieldError("years")} />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Technologies que vous utilisez</legend>
          <div className="flex flex-wrap gap-2">
            {choices.map((s) => (
              <ToggleChip key={s} pressed={stack.includes(s)} onClick={() => toggle(s)}>
                {s}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <TextArea id="bio" name="bio" label="En quelques mots (facultatif)" rows={3} maxLength={600} defaultValue={initial.bio} placeholder="Ce que vous construisez, ce que vous cherchez." />
        {role === "SENIOR" && (
          <Select id="capacity" name="capacity" label="Binômes que vous accompagnez en même temps" defaultValue={String(initial.mentorCapacity || 1)}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Aucun pour l’instant" : n}
              </option>
            ))}
          </Select>
        )}
        {role === "SENIOR" && initial.role === "SENIOR" && initial.verified && (
          <p className="text-xs text-muted">Si vous changez le lien de votre profil, l’équipe vérifie à nouveau votre statut Senior.</p>
        )}
        <TextField
          id="profile-link"
          name="link"
          label="Profil GitHub ou LinkedIn"
          defaultValue={initial.profileLink}
          placeholder="github.com/vous"
          hint={role === "SENIOR" ? "Obligatoire pour vérifier votre statut Senior." : "Facultatif. Aide les mentors à vous connaître."}
          error={fieldError("profileLink")}
        />
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </AuthFrame>
    </form>
  );
}
