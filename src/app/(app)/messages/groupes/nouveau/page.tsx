import type { Metadata } from "next";
import { NewGroupForm } from "./NewGroupForm";

export const metadata: Metadata = { title: "Nouveau groupe" };

export default function NewGroupPage() {
  return <NewGroupForm />;
}
