/*
 * KABAD realtime service.
 * Separate from the Next.js app so that long-lived sockets never slow down page rendering.
 *
 * - The browser gets a 10-minute token from the web app (/api/realtime/token) and opens a socket with it.
 * - Each socket joins the room of its member: "user:<id>".
 * - The web app writes to PostgreSQL and sends pg_notify inside the same transaction.
 *   This service LISTENs, reads the new message, and pushes it to the rooms of the recipients.
 * The service never writes to the database.
 */
import { createServer } from "node:http";
import { jwtVerify } from "jose";
import pg from "pg";
import { Server } from "socket.io";

try {
  await import("dotenv/config");
} catch {
  // In production the variables come from the environment.
}

const PORT = Number(process.env.REALTIME_PORT ?? 4001);
const SECRET = process.env.REALTIME_SECRET ?? "";
const DATABASE_URL = process.env.DATABASE_URL;
const ORIGINS = (process.env.REALTIME_ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean);
const CHANNEL = "kabad_realtime";

if (SECRET.length < 32) throw new Error("REALTIME_SECRET manquant ou trop court (32 caractères au moins).");
if (!DATABASE_URL) throw new Error("DATABASE_URL manquant.");

const key = new TextEncoder().encode(SECRET);
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });

const http = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, sockets: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(http, { cors: { origin: ORIGINS }, serveClient: false, pingInterval: 25_000 });

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") throw new Error("missing token");
    const { payload } = await jwtVerify(token, key, { audience: "kabad-realtime", algorithms: ["HS256"] });
    if (!payload.sub) throw new Error("missing subject");
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

const rooms = (ids) => ids.map((id) => `user:${id}`);

async function handle(event) {
  const to = rooms(event.recipients ?? []);
  if (to.length === 0) return;
  switch (event.t) {
    case "message": {
      const { rows } = await pool.query(
        `SELECT m.id, m."authorId", u.name AS "authorName", m.body, m.kind, m."createdAt", m."clientId"
         FROM "Message" m LEFT JOIN "User" u ON u.id = m."authorId" WHERE m.id = $1`,
        [event.messageId],
      );
      const m = rows[0];
      if (!m) return;
      io.to(to).emit("message:new", {
        conversationId: event.conversationId,
        message: { id: m.id, authorId: m.authorId, authorName: m.authorName, body: m.body, system: m.kind === "SYSTEM", createdAt: new Date(m.createdAt).toISOString(), clientId: m.clientId },
      });
      break;
    }
    case "conversation":
      io.to(to).emit("conversation:changed", { conversationId: event.conversationId });
      break;
    case "invitation":
      io.to(to).emit("invitation:new", { invitationId: event.invitationId });
      break;
    case "invitation_answered":
      io.to(to).emit("invitation:answered", { invitationId: event.invitationId, accepted: event.accepted, conversationId: event.conversationId ?? null });
      break;
    case "read":
      io.to(to).emit("conversation:read", { conversationId: event.conversationId });
      break;
  }
}

/** A dedicated connection for LISTEN, reopened if PostgreSQL restarts. */
async function listen(attempt = 0) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  const retry = () => {
    client.removeAllListeners();
    client.end().catch(() => {});
    const delay = Math.min(30_000, 1000 * 2 ** attempt);
    console.warn(`[realtime] connexion PostgreSQL perdue, nouvel essai dans ${delay} ms`);
    setTimeout(() => listen(attempt + 1), delay);
  };
  try {
    await client.connect();
    client.on("notification", (n) => {
      let event;
      try {
        event = JSON.parse(n.payload ?? "{}");
      } catch {
        return;
      }
      handle(event).catch((e) => console.error("[realtime] événement non traité", e));
    });
    client.on("error", retry);
    await client.query(`LISTEN ${CHANNEL}`);
    attempt = 0;
    console.log(`[realtime] à l’écoute de ${CHANNEL}`);
  } catch {
    retry();
  }
}

await listen();
http.listen(PORT, () => console.log(`[realtime] prêt sur le port ${PORT}`));

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    io.close();
    pool.end().finally(() => process.exit(0));
  });
}
