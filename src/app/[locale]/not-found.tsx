import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("notFound") };
}

export default function NotFound() {
  const t = useTranslations();
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-[480px] content-center justify-items-start gap-4 px-6 py-12">
      <LogoMark size={48} decorative />
      <h1 className="font-display text-2xl font-extrabold uppercase">{t("errors.notFoundTitle")}</h1>
      <p className="text-muted">{t("errors.notFoundText")}</p>
      <ButtonLink href="/accueil">{t("common.backHome")}</ButtonLink>
    </main>
  );
}
