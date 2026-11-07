import { Router } from "express";
import { env } from "../config/env.js";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  GitHubError,
  deleteWebhook,
  getGitHubToken,
  githubFetch,
  githubSend,
} from "../services/github.js";
import { requestAudit } from "../audit/request.js";
import { monitoringLimiter } from "../middleware/rateLimits.js";

const router = Router();

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// POST /repos/:id/monitoring: turn monitoring on
router.post("/repos/:id/monitoring", requireAuth, monitoringLimiter, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const repoId = parseId(req.params.id);
    if (!repoId)
      return res.status(400).json({ error: "Invalid repository id" });

    if (!env.publicUrl) {
      return res.status(503).json({
        error: "monitoring_not_configured",
        message: "Monitoring isn't available on this server yet.",
      });
    }

    const { rows } = await query(
      `SELECT id, github_repo_id, monitoring_enabled
       FROM repositories WHERE id = $1 AND user_id = $2`,
      [repoId, userId],
    );
    const repo = rows[0];
    if (!repo) return res.status(404).json({ error: "Repository not found" });
    if (repo.monitoring_enabled) return res.json({ monitoring: true });

    // Did the user grant the webhook permission when logging in?
    const account = await query(
      "SELECT scopes FROM github_accounts WHERE user_id = $1",
      [userId],
    );
    const scopes = (account.rows[0]?.scopes ?? "").split(/[,\s]+/);
    if (!scopes.includes("admin:repo_hook")) {
      return res.status(403).json({
        error: "reauthorize_required",
        message: "Log in with GitHub again to grant webhook permission.",
      });
    }

    const token = await getGitHubToken(userId);
    if (!token)
      return res.status(401).json({ error: "No GitHub account linked" });

    // Only repository admins can create webhooks
    const ghRepo = await githubFetch(
      token,
      `/repositories/${repo.github_repo_id}`,
    );
    if (!ghRepo.permissions?.admin) {
      return res
        .status(403)
        .json({
          error:
            "You need admin access to this repository to enable monitoring",
        });
    }

    const hook = await githubSend(
      token,
      "POST",
      `/repos/${ghRepo.full_name}/hooks`,
      {
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: `${env.publicUrl}/webhooks/github`,
          content_type: "json",
          secret: env.webhookSecret,
          insecure_ssl: "0",
        },
      },
    );

    try {
      await query(
        `UPDATE repositories
         SET monitoring_enabled = true, webhook_id = $1, full_name = $2
         WHERE id = $3`,
        [hook.id, ghRepo.full_name, repo.id],
      );
    } catch (err) {
      // Don't leave an orphaned webhook behind
      await deleteWebhook(userId, ghRepo.full_name, hook.id);
      throw err;
    }

    // Baseline audit, so the next push has something to be compared against
    await requestAudit(repo.id, "manual");

    res.status(201).json({ monitoring: true, webhookId: hook.id });
  } catch (err) {
    if (err instanceof GitHubError) {
      if (err.status === 422) {
        return res.status(409).json({
          error:
            "A webhook with this URL already exists. Remove it in the repository's Settings → Webhooks, then try again.",
        });
      }
      if (err.status === 401)
        return res
          .status(401)
          .json({ error: "GitHub session expired, please log in again" });
      if (err.status === 403 || err.status === 404) {
        return res
          .status(403)
          .json({
            error: "GitHub refused. You need admin access to this repository.",
          });
      }
      if (err.status === 429)
        return res
          .status(429)
          .json({ error: "GitHub rate limit reached, try again later" });
      return res.status(502).json({ error: "GitHub request failed" });
    }
    next(err);
  }
});

// DELETE /repos/:id/monitoring: turn monitoring off
router.delete("/repos/:id/monitoring", requireAuth, monitoringLimiter, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const repoId = parseId(req.params.id);
    if (!repoId)
      return res.status(400).json({ error: "Invalid repository id" });

    const { rows } = await query(
      "SELECT id, full_name, webhook_id FROM repositories WHERE id = $1 AND user_id = $2",
      [repoId, userId],
    );
    const repo = rows[0];
    if (!repo) return res.status(404).json({ error: "Repository not found" });

    const webhookRemoved = await deleteWebhook(
      userId,
      repo.full_name,
      repo.webhook_id,
    );
    await query(
      "UPDATE repositories SET monitoring_enabled = false, webhook_id = NULL WHERE id = $1",
      [repo.id],
    );

    res.json({ monitoring: false, webhookRemoved });
  } catch (err) {
    next(err);
  }
});

export default router;
