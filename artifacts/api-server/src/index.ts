import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachWebSockets } from "./lib/ws";
import { ensureDemoTenant } from "./lib/tenant";
import { db } from "./lib/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
attachWebSockets(server);

// Bootstrap pgvector extension (idempotent — no-ops when already installed).
db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)
  .then(() => logger.info("pgvector extension ready"))
  .catch((err: unknown) => logger.warn({ err }, "pgvector extension check skipped"));

// Bootstrap the demo tenant up-front so /api/auth/demo-login never races.
ensureDemoTenant().catch((err) => logger.warn({ err }, "Demo tenant bootstrap deferred"));

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
