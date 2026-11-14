import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const RANGES = [7, 30, 90];

// GET /stats/trend?days=30
// One point per day: the average score of each repository's latest finished audit as of that day
router.get("/stats/trend", requireAuth, async (req, res, next) => {
  try {
    const requested = Number(req.query.days);
    const days = RANGES.includes(requested) ? requested : 30;

    const { rows } = await query(
      `WITH days AS (
         SELECT generate_series(
                  date_trunc('day', now()) - make_interval(days => $2::int - 1),
                  date_trunc('day', now()),
                  interval '1 day'
                ) AS day
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              round(avg(la.score))::int AS avg_score,
              coalesce(sum(la.problems), 0)::int AS problems,
              count(la.score)::int AS audited
       FROM days d
       LEFT JOIN repositories r
         ON r.user_id = $1 AND r.created_at < d.day + interval '1 day'
       LEFT JOIN LATERAL (
         SELECT a.score,
                (SELECT count(*) FROM audit_findings f
                 WHERE f.audit_id = a.id AND NOT f.accepted) AS problems
         FROM audits a
         WHERE a.repository_id = r.id
           AND a.status = 'done'
           AND a.finished_at < d.day + interval '1 day'
         ORDER BY a.id DESC
         LIMIT 1
       ) la ON true
       GROUP BY d.day
       ORDER BY d.day`,
      [req.session.userId, days]
    );

    return res.json({ days, points: rows });
  } catch (err) {
    next(err);
  }
});

// GET /activity?limit=6: the latest finished audits across all repositories
router.get("/activity", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 30);

    const { rows } = await query(
      `SELECT a.id, a.status, a.score, a.triggered_by, a.created_at, a.finished_at,
              r.id AS repository_id, r.full_name,
              (SELECT count(*)::int FROM audit_findings f
               WHERE f.audit_id = a.id AND NOT f.accepted) AS problems,
              (SELECT count(*)::int FROM audit_findings f
               WHERE f.audit_id = a.id AND NOT f.accepted AND f.severity = 'critical') AS critical
       FROM audits a
       JOIN repositories r ON r.id = a.repository_id
       WHERE r.user_id = $1 AND a.status IN ('done', 'failed')
       ORDER BY a.finished_at DESC NULLS LAST, a.id DESC
       LIMIT $2`,
      [req.session.userId, limit]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;