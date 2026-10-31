import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
