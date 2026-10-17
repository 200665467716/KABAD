import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "./Inbox";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}
