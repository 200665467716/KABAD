import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { listMentors } from "@/server/members";
import { pageUser } from "@/server/page";
import { MentorSearch } from "./MentorSearch";

export const metadata: Metadata = { title: "Trouver un mentor" };

async function MentorsData() {
  const user = await pageUser("/mentorat/mentors");
  const mentors = (await listMentors()).filter((m) => m.id !== user.id);
  return <MentorSearch mentors={mentors} />;
}

export default function MentorsPage() {
  return (
    <>
      <TopBar back="/mentorat" title="Trouver un mentor" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des mentors…</p>}>
        <MentorsData />
      </Suspense>
    </>
  );
}
