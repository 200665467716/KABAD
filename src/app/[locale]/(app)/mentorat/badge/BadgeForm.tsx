"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { ToggleChip } from "@/components/ui/Controls";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { BadgeRequestView } from "@/lib/domain-types";
import { badgeRequestSchema } from "@/lib/schemas";

const DOMAINS = ["Backend", "Frontend", "Mobile", "Cloud et DevOps", "Data et IA", "Paiements et fintech", "Sécurité", "Produit et UX"] as const;
const EXPERIENCE = ["3-5", "5-10", "10+"] as const;
const STEP1 = ["domains", "technologies", "experience", "jobTitle", "company"];

/** The mentor badge request in two steps: expertise, then links and presentation (screens B1 and B2). */
export function BadgeForm({ initial, updating }: { initial: BadgeRequestView | null; updating: boolean }) {
  const t = useTranslations("mentoring");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [domains, setDomains] = useState<string[]>(initial?.domains ?? []);
  const [technologies, setTechnologies] = useState(initial?.technologies.join(", ") ?? "");
  const [experience, setExperience] = useState<string>(initial?.experience ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [githubUrl, setGithubUrl] = useState(initial?.githubUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [topics, setTopics] = useState(initial?.topics ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const input = () => ({
    domains,
    technologies: technologies.split(",").map((s) => s.trim()).filter(Boolean),
    experience,
    jobTitle,
    company,
    githubUrl,
    linkedinUrl,
    portfolioUrl,
    bio,
    topics,
  });

  function issues(only?: string[]): { data: ReturnType<typeof badgeRequestSchema.parse> | null; errors: Record<string, string> } {
    const parsed = badgeRequestSchema.safeParse(input());
    if (parsed.success) return { data: parsed.data, errors: {} };
    const found: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0]);
      if ((!only || only.includes(k)) && !found[k]) found[k] = i.message;
    }
    return { data: null, errors: found };
  }

  function next() {
    const { errors: e } = issues(STEP1);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  }

  async function submit() {
    const { data, errors: e } = issues();
    if (!githubUrl && !linkedinUrl && !portfolioUrl) e.githubUrl ??= t("badge.linksHint");
    setErrors(e);
    if (!data || Object.keys(e).length) return;
    setBusy(true);
    try {
      await api("/api/badges", { body: data });
      router.replace("/mentorat/badge");
      router.refresh();
    } catch (err) {
      setErrors({ [err instanceof ApiError && err.field ? err.field : "form"]: err instanceof ApiError ? err.message : t("error") });
      setBusy(false);
    }
  }

  const optional = <span className="font-semibold text-muted">{t("badge.optional")}</span>;

  return (
    <>
      <div className="bg-header text-on-header">
        <div className="mx-auto flex max-w-[680px] items-center justify-between gap-2 px-4 pb-1 lg:px-10">
          <span className="font-display text-sm font-extrabold uppercase">{t("badge.heading")}</span>
          <span className="text-[13px] font-extrabold text-on-header-muted">{step} / 2</span>
        </div>
        <div className="mx-auto flex max-w-[680px] gap-1 px-4 pb-3 lg:px-10" aria-hidden="true">
          {[1, 2].map((n) => (
            <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= step ? "bg-on-header" : "bg-on-header/25")} />
          ))}
        </div>
      </div>
      <Page narrow>
        {step === 1 ? (
          <>
            <div className="grid gap-2">
              <h2 className="font-display text-2xl font-extrabold uppercase">{t("badge.step1Title")}</h2>
              <p className="text-[15px] leading-[22px]">{t("badge.step1Lead")}</p>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-2 flex w-full justify-between text-sm font-extrabold">
                {t("badge.domains")} <span className="text-muted">{t("badge.domainsCount", { count: domains.length })}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {DOMAINS.map((d) => {
                  const on = domains.includes(d);
                  return (
                    <ToggleChip key={d} pressed={on} onClick={() => setDomains(on ? domains.filter((x) => x !== d) : domains.length < 3 ? [...domains, d] : domains)}>
                      {t(`badge.domainList.${d}`)}
                    </ToggleChip>
                  );
                })}
              </div>
              {errors.domains && <span className="text-sm font-extrabold text-danger">{errors.domains}</span>}
            </fieldset>
            <TextField id="technologies" label={t("badge.technologies")} hint={t("badge.technologiesHint")} value={technologies} onChange={(e) => setTechnologies(e.target.value)} error={errors.technologies} />
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-extrabold">{t("badge.experience")}</legend>
              <div className="grid grid-cols-3 gap-1 rounded-action border-2 border-line-strong bg-raised p-1">
                {EXPERIENCE.map((x) => (
                  <button key={x} type="button" aria-pressed={experience === x} onClick={() => setExperience(x)} className={cn("h-10 rounded-[10px] text-sm font-extrabold", experience === x ? "bg-ink text-raised" : "text-muted")}>
                    {t(`badge.experienceOptions.${x}`)}
                  </button>
                ))}
              </div>
              {errors.experience && <span className="text-sm font-extrabold text-danger">{errors.experience}</span>}
            </fieldset>
            <TextField id="jobTitle" label={t("badge.jobTitle")} value={jobTitle} maxLength={80} onChange={(e) => setJobTitle(e.target.value)} error={errors.jobTitle} />
            <TextField
              id="company"
              label={
                <>
                  {t("badge.company")} {optional}
                </>
              }
              value={company}
              maxLength={80}
              onChange={(e) => setCompany(e.target.value)}
              error={errors.company}
            />
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-extrabold uppercase">{t("badge.step2Title")}</h2>
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-sm font-extrabold">
                {t("badge.links")} <span className="font-semibold text-muted">{t("badge.linksHint")}</span>
              </legend>
              <TextField id="githubUrl" type="url" inputMode="url" label={t("badge.github")} placeholder="https://github.com/…" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} error={errors.githubUrl} />
              <TextField id="linkedinUrl" type="url" inputMode="url" label={t("badge.linkedin")} placeholder="https://www.linkedin.com/in/…" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} error={errors.linkedinUrl} />
              <TextField id="portfolioUrl" type="url" inputMode="url" label={t("badge.portfolio")} placeholder="https://…" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} error={errors.portfolioUrl} />
            </fieldset>
            <TextArea id="bio" label={t("badge.bio")} rows={4} maxLength={280} counter={t("badge.bioCount", { count: bio.length })} value={bio} onChange={(e) => setBio(e.target.value)} error={errors.bio} />
            <TextArea id="topics" label={t("badge.topics")} rows={3} maxLength={300} placeholder={t("badge.topicsPlaceholder")} value={topics} onChange={(e) => setTopics(e.target.value)} error={errors.topics} />
          </>
        )}
        {errors.form && (
          <Alert tone="danger" role="alert">
            {errors.form}
          </Alert>
        )}
      </Page>
      <ActionBar>
        {step === 1 ? (
          <Button size="lg" block onClick={next}>
            {t("badge.continue")}
          </Button>
        ) : (
          <>
            <Button size="lg" block onClick={submit} disabled={busy}>
              {updating ? t("badge.update") : t("badge.submit")}
            </Button>
            <Button variant="ghost" block onClick={() => setStep(1)} disabled={busy}>
              {t("badge.back")}
            </Button>
          </>
        )}
      </ActionBar>
    </>
  );
}
