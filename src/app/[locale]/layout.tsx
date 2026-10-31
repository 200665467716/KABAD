import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { isLocale, routing } from "@/i18n/routing";
import "../globals.css";

// Charte « Motif » : Unbounded pour les titres, Manrope pour tout le reste.
// Les deux couvrent le latin étendu (lettres de nombreuses langues d'Afrique de l'Ouest et du Centre).
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "latin-ext"], display: "swap" });

/** Les deux langues sont pré-rendues ; toute autre valeur du segment donne une page introuvable. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: "KABAD", template: "%s · KABAD" },
    description: t("description"),
    applicationName: "KABAD",
    appleWebApp: { capable: true, title: "KABAD", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#283588" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1020" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${unbounded.variable} ${manrope.variable}`}>
      {/* Some browser extensions add attributes to <body> before React loads; this ignores those attributes only, not the content. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
