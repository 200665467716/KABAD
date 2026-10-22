import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter for headings and text, JetBrains Mono for code. Both cover the letters of West and Central African languages (ɛ ɔ ŋ ɓ ɗ ƙ ẹ ọ ṣ ɖ ƒ ɣ ʋ).
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin", "latin-ext"], display: "swap" });

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
    <html lang="fr" className={`${inter.variable} ${mono.variable}`}>
      {/* Some browser extensions add attributes to <body> before React loads; this ignores those attributes only, not the content. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
