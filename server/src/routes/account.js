import { Router } from "express";
import { pool, query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { accountLimiter } from "../middleware/rateLimits.js";
import { mapLimit } from "../audit/helpers.js";
import { confirmationMatches } from "../utils/confirmation.js";
import {
  deleteWebhook,
  getGitHubToken,
  revokeGitHubAuthorization,
} from "../services/github.js";

const router = Router();

// GET /account: what the Settings page shows
router.get("/account", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.avatar_url, u.created_at, g.login, g.scopes,
              (SELECT count(*)::int FROM repositories r
               WHERE r.user_id = u.id) AS repository_count,
              (SELECT count(*)::int FROM repositories r
               WHERE r.user_id = u.id AND r.monitoring_enabled) AS monitored_count,
              (SELECT count(*)::int FROM audits a
               JOIN repositories r ON r.id = a.repository_id
               WHERE r.user_id = u.id) AS audit_count
       FROM users u
       JOIN github_accounts g ON g.user_id = u.id
       WHERE u.id = $1`,
      [req.session.userId]
    );

    if (rows.length === 0) return res.status(401).json({ error: "Not authenticated" });
    return res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /account   body: { confirm: "<your GitHub username>" }
router.delete("/account", requireAuth, accountLimiter, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const account = await query("SELECT login FROM github_accounts WHERE user_id = $1", [userId]);
    const login = account.rows[0]?.login;

    if (!confirmationMatches(login, req.body?.confirm)) {
      return res.status(400).json({
        error: "confirmation_mismatch",
        message: "Type your GitHub username exactly to confirm.",
      });
    }

    // 1. Remove our webhooks from GitHub, while the token still works
    const monitored = await query(
      `SELECT full_name, webhook_id FROM repositories
       WHERE user_id = $1 AND webhook_id IS NOT NULL`,
      [userId]
    );
    const hookResults = await mapLimit(monitored.rows, 4, async (repo) => ({
      name: repo.full_name,
      removed: await deleteWebhook(userId, repo.full_name, repo.webhook_id).catch(() => false),
    }));
    const webhooksFailed = hookResults.filter((r) => !r.removed).map((r) => r.name);

    // 2. Revoke RepoGuard's access in the user's GitHub account
    const token = await getGitHubToken(userId).catch(() => null);
    const githubRevoked = token ? await revokeGitHubAuthorization(token) : false;

    // 3. Delete everything we hold, in one transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // These records only point loosely at repositories, so they must be removed first
      await client.query(
        `DELETE FROM webhook_events
         WHERE repository_id IN (SELECT id FROM repositories WHERE user_id = $1)`,
        [userId]
      );

      // Every login session of this user, on every device
      await client.query("DELETE FROM session WHERE sess->>'userId' = $1", [String(userId)]);

      // Cascades to: github_accounts, repositories, audits, findings, accepted risks,
      // AI drafts, notifications and AI usage
      await client.query("DELETE FROM users WHERE id = $1", [userId]);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // 4. End this session and tell the browser what happened
    req.session.destroy((err) => {
      if (err) console.error("Session destroy failed after account deletion:", err.message);
      res.clearCookie("repoguard.sid");
      return res.json({ ok: true, githubRevoked, webhooksFailed });
    });
  } catch (err) {
    next(err);
  }
});

export default router;