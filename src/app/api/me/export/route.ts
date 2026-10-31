import { exportData } from "@/server/account";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const GET = route(async () => {
  const user = await requireUser();
  await rateLimit(`export:${user.id}`, 5, 3600_000, "Tu as déjà exporté tes données plusieurs fois.");
  return new Response(JSON.stringify(await exportData(user.id), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="kabad-mes-donnees.json"', "Cache-Control": "no-store" },
  });
});
