"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Checkbox, RadioCard, Select, TextField } from "@/components/ui/Field";

const STACK = ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Flutter", "PHP", "Java"];
const COUNTRIES = ["Bénin", "Burkina Faso", "Cameroun", "Côte d’Ivoire", "Ghana", "Mali", "Niger", "Nigeria", "RD Congo", "Sénégal", "Togo", "Autre pays"];

export function ProfileSetup() {
  const router = useRouter();
  const [role, setRole] = useState<"junior" | "senior">("junior");
  const [stack, setStack] = useState<string[]>(["TypeScript", "React", "Node.js"]);
  const toggle = (s: string) => setStack((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/inscription/recommandations");
      }}
    >
      <AuthFrame
        back="/inscription"
        step={2}
        title="Comment voulez-vous participer ?"
        lead="Vous pourrez changer plus tard. Un senior peut aussi apprendre."
        footer={
          <Button type="submit" size="lg" block>
            Continuer
          </Button>
        }
      >
        <fieldset className="grid gap-2">
          <legend className="sr-only">Votre rôle</legend>
          <RadioCard name="role" value="junior" checked={role === "junior"} onChange={() => setRole("junior")} heading="J’apprends" description="Junior : je cherche un mentor et des défis." />
          <RadioCard name="role" value="senior" checked={role === "senior"} onChange={() => setRole("senior")} heading="Je transmets" description="Senior : 5 ans d’expérience ou plus. Statut vérifié sous 72 h." />
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Select id="country" name="country" label="Pays" defaultValue="Togo">
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <TextField id="city" name="city" label="Ville" defaultValue="Lomé" autoComplete="address-level2" />
        </div>
        <Checkbox name="diaspora">Je vis hors d’Afrique (diaspora)</Checkbox>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Technologies que vous utilisez</legend>
          <div className="flex flex-wrap gap-2">
            {STACK.map((s) => (
              <ToggleChip key={s} pressed={stack.includes(s)} onClick={() => toggle(s)}>
                {s}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <TextField
          id="profile-link"
          name="link"
          label="Profil GitHub ou LinkedIn"
          defaultValue="github.com/kmensah"
          hint={role === "senior" ? "Obligatoire pour vérifier votre statut Senior." : "Facultatif. Aide les mentors à vous connaître."}
          required={role === "senior"}
        />
      </AuthFrame>
    </form>
  );
}
