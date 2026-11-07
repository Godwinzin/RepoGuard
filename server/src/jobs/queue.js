import PgBoss from "pg-boss";
import { env } from "../config/env.js";
import { processAudit } from "../audit/runAudit.js";
import { processRecommendation } from "../ai/recommend.js";

const AUDIT_QUEUE = "run-audit";
const RECOMMENDATION_QUEUE = "generate-recommendation";
let boss;

export async function startQueue() {
  boss = new PgBoss({ connectionString: env.databaseUrl, max: 4 });
  boss.on("error", (err) => console.error("pg-boss error:", err.message));

  await boss.start();
  await boss.createQueue(AUDIT_QUEUE);
  await boss.createQueue(RECOMMENDATION_QUEUE);

  await boss.work(AUDIT_QUEUE, { pollingIntervalSeconds: 3 }, async ([job]) => {
    await processAudit(job.data.auditId);
  });

  await boss.work(RECOMMENDATION_QUEUE, { pollingIntervalSeconds: 3 }, async ([job]) => {
    await processRecommendation(job.data.recommendationId);
  });

  console.log("Job queue started");
}

export async function enqueueAudit(auditId) {
  return boss.send(
    AUDIT_QUEUE,
    { auditId },
    { retryLimit: 2, retryDelay: 30, expireInSeconds: 300 }
  );
}

export async function enqueueRecommendation(recommendationId) {
  return boss.send(
    RECOMMENDATION_QUEUE,
    { recommendationId },
    { retryLimit: 1, retryDelay: 30, expireInSeconds: 180 }
  );
}

export async function stopQueue() {
  if (boss) await boss.stop({ graceful: true, timeout: 10000 });
}