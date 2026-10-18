import { SignJWT } from "jose";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";

/** A short-lived token the browser hands to the realtime service to prove who it is. */
export const GET = route(async () => {
  const user = await requireUser();
  const secret = process.env.REALTIME_SECRET;
  if (!secret || secret.length < 32) throw new Error("REALTIME_SECRET manquant ou trop court.");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setAudience("kabad-realtime")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
  return Response.json({ token, url: process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4001" });
});
