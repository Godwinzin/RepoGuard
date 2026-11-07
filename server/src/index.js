import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { startQueue, stopQueue } from "./jobs/queue.js";

await startQueue();

const server = app.listen(env.port, () => {
  console.log(`RepoGuard server running on port ${env.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);

  // If something hangs, don't wait forever
  setTimeout(() => process.exit(1), 15_000).unref();

  server.close(async () => {
    await stopQueue(); // let the current job finish first
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// A forgotten .catch() somewhere: log it loudly, but keep serving
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason instanceof Error ? reason.stack : reason);
});

// After an uncaught exception the process may be in a broken state:
// log it, then exit and let the host restart a clean one
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.stack);
  process.exit(1);
});