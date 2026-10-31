/*
 * KABAD worker: runs the scheduled tasks of src/server/jobs.ts with pg-boss, outside the web app.
 * pg-boss keeps its queues in PostgreSQL (schema "pgboss"): a schedule fires once even with several
 * workers, and a task that fails is retried.
 *   Local: npm run worker (reads .env)
 *   Server: the "worker" service of compose.yaml.
 */
import { PgBoss } from "pg-boss";
import { JOBS } from "../src/server/jobs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant.");

const boss = new PgBoss({ connectionString: url, schema: "pgboss" });
boss.on("error", (e) => console.error("[worker]", e));

async function main() {
  await boss.start();
  for (const [name, job] of Object.entries(JOBS)) {
    await boss.createQueue(name);
    await boss.schedule(name, job.cron);
    await boss.work(name, async () => {
      const count = await job.run();
      if (count) console.info(`[worker] ${name} : ${count}`);
      return { count };
    });
  }
  console.info(`[worker] ${Object.keys(JOBS).length} tâches planifiées.`);
}

async function shutdown() {
  await boss.stop({ graceful: true, timeout: 20_000 });
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((e) => {
  console.error("[worker] arrêt :", e);
  process.exit(1);
});
