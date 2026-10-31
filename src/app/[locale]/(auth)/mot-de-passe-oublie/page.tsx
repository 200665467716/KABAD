import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPassword } from "./ForgotPassword";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("forgot") };
}

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
