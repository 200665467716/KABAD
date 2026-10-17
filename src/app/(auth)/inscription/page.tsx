import type { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignUpPage() {
  return <SignUpForm />;
}
