import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("metaTitle") };
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Date of the working draft shown under the title. */
const VERSION = new Date(Date.UTC(2026, 9, 22));

/* Draft written from the rules the app enforces; to be reviewed by a lawyer before launch. */
export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const format = await getFormatter();
  return (
    <main className="mx-auto grid max-w-[720px] gap-6 px-6 py-10 leading-7">
      <Link href="/" aria-label={t("homeLabel")}>
        <LogoMark size={40} decorative />
      </Link>
      <h1 className="font-display text-[30px] leading-9 font-bold">{t("title")}</h1>
      <p className="text-sm text-muted">{t("version", { date: format.dateTime(VERSION, { day: "numeric", month: "long", year: "numeric" }) })}</p>

      <Part title={t("charter.title")}>
        <ul className="grid list-disc gap-1 pl-5">
          <li>{t("charter.respect")}</li>
          <li>{t("charter.abuse")}</li>
          <li>{t("charter.code")}</li>
          <li>{t("charter.honesty")}</li>
        </ul>
      </Part>
      <Part title={t("moderation.title")}>
        <p>{t("moderation.text")}</p>
      </Part>
      <Part title={t("data.title")}>
        <ul className="grid list-disc gap-1 pl-5">
          <li>{t("data.kept")}</li>
          <li>{t("data.voice")}</li>
          <li>{t("data.account")}</li>
        </ul>
      </Part>
      <Part title={t("prizes.title")}>
        <p>{t("prizes.text")}</p>
      </Part>
      <Link href="/inscription" className="font-bold">
        {t("backToSignup")}
      </Link>
    </main>
  );
}
