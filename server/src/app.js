import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { requestLogger } from "./middleware/requestLogger.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import reposRouter from "./routes/repos.js";
import auditsRouter from "./routes/audits.js";
import monitoringRouter from "./routes/monitoring.js";
import notificationsRouter from "./routes/notifications.js";
import recommendationsRouter from "./routes/recommendations.js";
import webhooksRouter from "./routes/webhooks.js";
import acceptedRouter from "./routes/accepted.js";

const app = express();

if (env.isProd) app.set("trust proxy", env.trustProxy);

const PgStore = connectPgSimple(session);

app.use(helmet());
app.use(requestLogger);

// Webhooks first: they need the RAW body and no cookies or sessions
app.use("/webhooks", webhooksRouter);

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "20kb" })); // our API only receives tiny JSON bodies

app.use(
  session({
    store: new PgStore({ pool, tableName: "session" }),
    name: "repoguard.sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/repos", reposRouter);
app.use("/notifications", notificationsRouter);
app.use(auditsRouter);
app.use(monitoringRouter);
app.use(recommendationsRouter);
app.use(acceptedRouter);
// A friendly answer for anyone (or any bot) who opens the API address directly
app.get("/", (req, res) => {
  res.json({ service: "RepoGuard API", status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  // If a response was already sent, let Express close the connection instead of crashing again
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;