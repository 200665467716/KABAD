import type { Metadata } from "next";
import { TestList } from "./TestList";

export const metadata: Metadata = { title: "Tests communautaires" };

export default function TestsPage() {
  return <TestList />;
}
