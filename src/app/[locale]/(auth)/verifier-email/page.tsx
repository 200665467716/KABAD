import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { VerifyEmail } from "./VerifyEmail";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("verify"), robots: { index: false } };
}

async function VerifyData({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const [{ jeton }, user] = await Promise.all([searchParams, getCurrentUser()]);
  return <VerifyEmail token={jeton ?? ""} email={user?.email ?? null} verified={user?.emailVerifiedAt != null} />;
}

/** Screen A3, step 2 of 5: the 6-digit code, or the link opened from the e-mail (?jeton=…). */
export default function VerifyEmailPage({ searchParams }: PageProps<"/[locale]/verifier-email">) {
  return (
    <Suspense>
      <VerifyData searchParams={searchParams as Promise<{ jeton?: string }>} />
    </Suspense>
  );
}
