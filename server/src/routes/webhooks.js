import { Router, raw } from "express";
import { env } from "../config/env.js";
import { query } from "../db/pool.js";
import { requestAudit } from "../audit/request.js";
import { verifySignature } from "../utils/webhookSignature.js";

const router = Router();

// express.raw gives us the untouched bytes, which the signature is computed over
router.post("/github", raw({ type: "application/json", limit: "10mb" }), async (req, res, next) => {
  try {
    // 1. Authenticate: is this really from GitHub?
    if (
      !Buffer.isBuffer(req.body) ||
      !verifySignature(env.webhookSecret, req.body, req.get("x-hub-signature-256"))
    ) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.get("x-github-event");
    const deliveryId = req.get("x-github-delivery");
    const hookIdHeader = Number(req.get("x-github-hook-id"));
    const hookId = Number.isSafeInteger(hookIdHeader) ? hookIdHeader : null;

    if (!event || !deliveryId) return res.status(400).json({ error: "Missing headers" });

    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    // 2. Decide what this delivery means
    let outcome = "ignored_event";
    let repository = null;

    if (event === "ping") {
      outcome = "ping"; // GitHub sends this when a webhook is created
    } else if (event === "push") {
      // The hook ID tells us exactly which RepoGuard repository this hook belongs to
      const { rows } = await query(
        `SELECT id, github_repo_id, default_branch
         FROM repositories
         WHERE webhook_id = $1 AND monitoring_enabled = true`,
        [hookId]
      );
      repository = rows[0] ?? null;

      if (!repository || Number(repository.github_repo_id) !== payload.repository?.id) {
        outcome = "no_repository"; // unknown or orphaned hook
      } else if (payload.deleted || payload.ref !== `refs/heads/${repository.default_branch}`) {
        outcome = "ignored_branch"; // we only audit the default branch
      } else {
        outcome = "audit_queued";
      }
    }

    // 3. Claim the delivery ID. If it already exists, this is a duplicate.
    const claimed = await query(
      `INSERT INTO webhook_events
         (delivery_id, event_type, hook_id, repository_id, ref, commit_sha, outcome)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (delivery_id) DO NOTHING
       RETURNING id`,
      [
        deliveryId,
        event,
        hookId,
        repository?.id ?? null,
        payload.ref ?? null,
        payload.after ?? null,
        outcome,
      ]
    );
    if (claimed.rowCount === 0) return res.status(200).json({ status: "duplicate" });

    // 4. Do the (quick) work: create the audit and queue the job
    if (outcome === "audit_queued") {
      try {
        await requestAudit(repository.id, "push");
      } catch (err) {
        // Release the claim so GitHub's redelivery can be processed
        await query("DELETE FROM webhook_events WHERE delivery_id = $1", [deliveryId]);
        throw err;
      }
    }

    // Reply fast. GitHub gives up on slow responses after about 10 seconds.
    res.status(202).json({ status: outcome });
  } catch (err) {
    next(err);
  }
});

export default router;