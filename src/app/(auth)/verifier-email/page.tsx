import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "./VerifyEmail";

export const metadata: Metadata = { title: "Confirmer mon adresse", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
