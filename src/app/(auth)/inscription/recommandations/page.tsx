import type { Metadata } from "next";
import { Recommendations } from "./Recommendations";

export const metadata: Metadata = { title: "Des développeurs à rencontrer" };

export default function RecommendationsPage() {
  return <Recommendations />;
}
