import type { Metadata } from "next";
import { ForgotPassword } from "./ForgotPassword";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
