import { Router } from "express";
import { pool, query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { calculateScore } from "../audit/score.js";
import { validateReason } from "../audit/acceptReason.js";

const router = Router();

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function ownsRepo(repoId, userId) {
  const { rows } = await query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [repoId, userId]
  );
  return rows.length > 0;
}

// Recompute one audit's score from its findings that are not accepted
async function rescore(client, auditId) {
  const { rows } = await client.query(
    "SELECT severity, accepted FROM audit_findings WHERE audit_id = $1",
    [auditId]
  );
  await client.query("UPDATE audits SET score = $1 WHERE id = $2", [calculateScore(rows), auditId]);
}

// GET /repos/:id/accepted-findings
router.get("/repos/:id/accepted-findings", requireAuth, async (req, res, next) => {
  try {
    const repoId = parseId(req.params.id);
    if (!repoId) return res.status(400).json({ error: "Invalid repository id" });
    if (!(await ownsRepo(repoId, req.session.userId))) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const { rows } = await query(
      `SELECT id, fingerprint, rule_id, title, file_path, reason, created_at
       FROM accepted_findings
       WHERE repository_id = $1
       ORDER BY created_at DESC`,
      [repoId]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /repos/:id/accepted-findings   body: { fingerprint, reason }
router.post("/repos/:id/accepted-findings", requireAuth, async (req, res, next) => {
  try {
    const repoId = parseId(req.params.id);
    const fingerprint = typeof req.body?.fingerprint === "string" ? req.body.fingerprint : "";

    if (!repoId) return res.status(400).json({ error: "Invalid repository id" });
    if (!fingerprint || fingerprint.length > 500) {
      return res.status(400).json({ error: "Invalid finding" });
    }
    if (!(await ownsRepo(repoId, req.session.userId))) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const latest = await query(
      `SELECT id FROM audits
       WHERE repository_id = $1 AND status = 'done'
       ORDER BY id DESC LIMIT 1`,
      [repoId]
    );
    if (latest.rows.length === 0) {
      return res.status(409).json({ error: "no_audit", message: "Run an audit first." });
    }
    const auditId = latest.rows[0].id;

    // The finding must exist in the latest audit. Users can't accept things we never reported.
    const found = await query(
      `SELECT rule_id, title, severity, file_path
       FROM audit_findings
       WHERE audit_id = $1 AND fingerprint = $2`,
      [auditId, fingerprint]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({
        error: "finding_not_found",
        message: "That problem isn't in the latest audit. Reload the page and try again.",
      });
    }
    const finding = found.rows[0];

    const check = validateReason(finding.severity, req.body?.reason);
    if (!check.ok) {
      return res.status(400).json({ error: "invalid_reason", message: check.message });
    }

    // The rule, the audit snapshot and the score change together or not at all
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const saved = await client.query(
        `INSERT INTO accepted_findings
           (repository_id, fingerprint, rule_id, title, file_path, reason, accepted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (repository_id, fingerprint)
         DO UPDATE SET reason = EXCLUDED.reason, accepted_by = EXCLUDED.accepted_by
         RETURNING id`,
        [
          repoId,
          fingerprint,
          finding.rule_id,
          finding.title,
          finding.file_path,
          check.reason,
          req.session.userId,
        ]
      );

      await client.query(
        `UPDATE audit_findings
         SET accepted = true, accepted_reason = $3
         WHERE audit_id = $1 AND fingerprint = $2`,
        [auditId, fingerprint, check.reason]
      );
      await rescore(client, auditId);

      await client.query("COMMIT");
      return res.status(201).json({ id: saved.rows[0].id });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /repos/:id/accepted-findings?fingerprint=...   (restore a risk)
router.delete("/repos/:id/accepted-findings", requireAuth, async (req, res, next) => {
  try {
    const repoId = parseId(req.params.id);
    const fingerprint = typeof req.query.fingerprint === "string" ? req.query.fingerprint : "";

    if (!repoId) return res.status(400).json({ error: "Invalid repository id" });
    if (!fingerprint || fingerprint.length > 500) {
      return res.status(400).json({ error: "Invalid finding" });
    }
    if (!(await ownsRepo(repoId, req.session.userId))) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        "DELETE FROM accepted_findings WHERE repository_id = $1 AND fingerprint = $2",
        [repoId, fingerprint]
      );

      const latest = await client.query(
        `SELECT id FROM audits
         WHERE repository_id = $1 AND status = 'done'
         ORDER BY id DESC LIMIT 1`,
        [repoId]
      );
      if (latest.rows.length > 0) {
        const auditId = latest.rows[0].id;
        await client.query(
          `UPDATE audit_findings
           SET accepted = false, accepted_reason = NULL
           WHERE audit_id = $1 AND fingerprint = $2`,
          [auditId, fingerprint]
        );
        await rescore(client, auditId);
      }

      await client.query("COMMIT");
      // Restoring something that's already restored still succeeds, so retries are safe
      return res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;