import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Connexion" };

export default function SignInPage() {
  return <SignInForm />;
}
