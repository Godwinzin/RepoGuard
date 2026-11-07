import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requestAudit } from "../audit/request.js";
import { loadAudit } from "../audit/report.js";
import { auditLimiter } from "../middleware/rateLimits.js";

const router = Router();

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// POST /repos/:id/audits: request an audit (runs in the background)
router.post("/repos/:id/audits", requireAuth, auditLimiter, async (req, res, next) => {
  try {
    const repoId = parseId(req.params.id);
    if (!repoId) return res.status(400).json({ error: "Invalid repository id" });

    // Ownership check: the repo must belong to this user
    const { rows } = await query(
      "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
      [repoId, req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Repository not found" });

    const audit = await requestAudit(repoId, "manual");

    // 202 Accepted = "got it, working on it", not "finished".
    // One request, one response: always `return` when you send.
    return res.status(202).json(await loadAudit(audit.id));
  } catch (err) {
    next(err);
  }
});

// GET /repos/:id/audits: audit history for one repo
router.get("/repos/:id/audits", requireAuth, async (req, res, next) => {
  try {
    const repoId = parseId(req.params.id);
    if (!repoId) return res.status(400).json({ error: "Invalid repository id" });

    const { rows } = await query(
      `SELECT a.id, a.status, a.score, a.commit_sha, a.created_at, a.finished_at,
              (SELECT count(*)::int FROM audit_findings f
               WHERE f.audit_id = a.id) AS finding_count,
              (SELECT count(*)::int FROM audit_findings f
               WHERE f.audit_id = a.id AND f.severity = 'critical') AS critical_count
       FROM audits a
       JOIN repositories r ON r.id = a.repository_id
       WHERE r.id = $1 AND r.user_id = $2
       ORDER BY a.id DESC
       LIMIT 50`,
      [repoId, req.session.userId]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /audits/:id: one full report
router.get("/audits/:id", requireAuth, async (req, res, next) => {
  try {
    const auditId = parseId(req.params.id);
    if (!auditId) return res.status(400).json({ error: "Invalid audit id" });

    // Ownership goes through the repository, since audits don't store user_id
    const owned = await query(
      `SELECT a.id
       FROM audits a
       JOIN repositories r ON r.id = a.repository_id
       WHERE a.id = $1 AND r.user_id = $2`,
      [auditId, req.session.userId]
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: "Audit not found" });

    return res.json(await loadAudit(auditId));
  } catch (err) {
    next(err);
  }
});

export default router;