import type { Metadata } from "next";
import { TopBar } from "@/components/shell/TopBar";
import { MentorSearch } from "./MentorSearch";

export const metadata: Metadata = { title: "Trouver un mentor" };

export default function MentorsPage() {
  return (
    <>
      <TopBar back="/mentorat" title="Trouver un mentor" />
      <MentorSearch />
    </>
  );
}
