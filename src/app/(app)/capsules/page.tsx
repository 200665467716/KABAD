import type { Metadata } from "next";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { CapsuleList } from "./CapsuleList";

export const metadata: Metadata = { title: "Capsules" };

export default function CapsulesPage() {
  return (
    <>
      <TopBar
        back="/mentorat"
        title="Capsules"
        actions={
          <Button size="sm" icon="plus">
            Publier
          </Button>
        }
      />
      <CapsuleList />
    </>
  );
}
