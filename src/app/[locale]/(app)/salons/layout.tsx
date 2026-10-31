import { notFound } from "next/navigation";
import { salonsEnabled } from "@/lib/features";

/** Voice rooms switched off (NEXT_PUBLIC_SALONS): every /salons screen is a 404. */
export default function SalonsLayout({ children }: LayoutProps<"/[locale]/salons">) {
  if (!salonsEnabled) notFound();
  return children;
}
