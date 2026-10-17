import type { Metadata, Viewport } from "next";
import { Danfo, Fira_Sans, Ojuju, Overpass_Mono } from "next/font/google";
import "./globals.css";

// All four faces cover the letters of West and Central African languages (ɛ ɔ ŋ ɓ ɗ ƙ ẹ ọ ṣ ɖ ƒ ɣ ʋ).
const ojuju = Ojuju({ variable: "--font-ojuju", subsets: ["latin", "latin-ext"], display: "swap" });
const fira = Fira_Sans({
  variable: "--font-fira",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const overpassMono = Overpass_Mono({ variable: "--font-overpass-mono", subsets: ["latin", "latin-ext"], display: "swap" });
const danfo = Danfo({ variable: "--font-danfo", subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "KABAD", template: "%s · KABAD" },
  description:
    "La communauté des développeurs d’Afrique et de la diaspora : mentorat, défis de code, tests communautaires et messagerie.",
  applicationName: "KABAD",
  appleWebApp: { capable: true, title: "KABAD", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1020" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${ojuju.variable} ${fira.variable} ${overpassMono.variable} ${danfo.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
