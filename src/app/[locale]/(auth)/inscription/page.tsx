import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "./SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("signUp") };
}

export default function SignUpPage() {
  return <SignUpForm />;
}
