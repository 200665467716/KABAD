import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ResetPassword } from "./ResetPassword";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("reset"), robots: { index: false } };
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
