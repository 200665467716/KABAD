import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { githubConfig } from "@/server/github";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Connexion" };

async function SignIn() {
  // Read at request time: the server's environment, not the one of the build.
  await connection();
  const demo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "1";
  return <SignInForm github={githubConfig() !== null} demo={demo} />;
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
