import { Router } from "express";
import { env } from "../config/env.js";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { enqueueRecommendation } from "../jobs/queue.js";

const TYPES = ["env_example", "readme"];
const DAILY_LIMIT = 10;

const router = Router();

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// POST /audits/:id/recommendations   body: { "type": "env_example" | "readme" }
router.post(
  "/audits/:id/recommendations",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!env.groqApiKey) {
        return res.status(503).json({
          error: "ai_not_configured",
          message: "AI suggestions aren't set up on this server yet.",
        });
      }

      const userId = req.session.userId;
      const auditId = parseId(req.params.id);
      const type = req.body?.type;

      if (!auditId) return res.status(400).json({ error: "Invalid audit id" });
      if (!TYPES.includes(type)) {
        return res
          .status(400)
          .json({ error: `type must be one of: ${TYPES.join(", ")}` });
      }

      // Ownership goes through the repository
      const owned = await query(
        `SELECT a.status
       FROM audits a
       JOIN repositories r ON r.id = a.repository_id
       WHERE a.id = $1 AND r.user_id = $2`,
        [auditId, userId],
      );
      if (owned.rows.length === 0)
        return res.status(404).json({ error: "Audit not found" });
      if (owned.rows[0].status !== "done") {
        return res
          .status(409)
          .json({ error: "The audit has not finished yet" });
      }

      // Daily quota: AI calls cost money
      const usage = await query(
        `SELECT count(*)::int AS used
       FROM ai_usage
       WHERE user_id = $1 AND created_at > now() - interval '24 hours'`,
        [userId],
      );
      if (usage.rows[0].used >= DAILY_LIMIT) {
        return res
          .status(429)
          .json({ error: "Daily AI limit reached, try again tomorrow" });
      }

      // Create the row, or reset an old one. The WHERE stops a restart while one is already active.
      const upserted = await query(
        `INSERT INTO recommendations (audit_id, type, status)
       VALUES ($1, $2, 'queued')
       ON CONFLICT (audit_id, type) DO UPDATE
         SET status = 'queued', content = NULL, model = NULL,
             error_message = NULL, finished_at = NULL
         WHERE recommendations.status NOT IN ('queued', 'running')
       RETURNING id, type, status`,
        [auditId, type],
      );

      if (upserted.rowCount === 0) {
        const existing = await query(
          "SELECT id, type, status FROM recommendations WHERE audit_id = $1 AND type = $2",
          [auditId, type],
        );
        return res.status(202).json(existing.rows[0]);
      }

      await query("INSERT INTO ai_usage (user_id) VALUES ($1)", [userId]);

      try {
        await enqueueRecommendation(upserted.rows[0].id);
      } catch (err) {
        await query(
          `UPDATE recommendations
         SET status = 'failed', error_message = 'Could not queue generation', finished_at = now()
         WHERE id = $1`,
          [upserted.rows[0].id],
        );
        throw err;
      }

      res.status(202).json(upserted.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// GET /audits/:id/recommendations
router.get(
  "/audits/:id/recommendations",
  requireAuth,
  async (req, res, next) => {
    try {
      const auditId = parseId(req.params.id);
      if (!auditId) return res.status(400).json({ error: "Invalid audit id" });

      const { rows } = await query(
        `SELECT rec.id, rec.type, rec.status, rec.content, rec.model,
              rec.error_message, rec.finished_at
       FROM recommendations rec
       JOIN audits a ON a.id = rec.audit_id
       JOIN repositories r ON r.id = a.repository_id
       WHERE rec.audit_id = $1 AND r.user_id = $2
       ORDER BY rec.id`,
        [auditId, req.session.userId],
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
