import pg from "pg";
import { env } from "../config/env.js";

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  connectionTimeoutMillis: 10_000, // give up waiting for a connection after 10 seconds
  query_timeout: 20_000, // give up waiting for an answer after 20 seconds
});

// An idle connection can die (the database restarted or suspended).
// Without this listener, Node treats that as an unhandled error and crashes.
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

export const query = (text, params) => pool.query(text, params);