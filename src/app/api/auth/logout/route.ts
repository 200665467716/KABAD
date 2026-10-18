import { destroySession } from "@/server/auth";
import { route } from "@/server/http";

export const POST = route(async () => {
  await destroySession();
  return new Response(null, { status: 204 });
});
