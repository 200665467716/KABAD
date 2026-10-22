import { notFound } from "next/navigation";
import { pageUser } from "./page";

/** Team pages answer 404 to everyone else: their existence is not advertised. */
export async function adminUser(path: string) {
  const user = await pageUser(path);
  if (!user.isAdmin) notFound();
  return user;
}
