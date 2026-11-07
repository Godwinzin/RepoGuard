import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  GitHubError,
  deleteWebhook,
  getGitHubToken,
  githubFetch,
  listUserRepos,
} from "../services/github.js";

const router = Router();
router.use(requireAuth);

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const REPO_WITH_SCORE = `
  SELECT r.id, r.github_repo_id, r.full_name, r.default_branch, r.is_private,
         r.monitoring_enabled, r.created_at,
         la.score AS latest_score, la.finished_at AS last_audited_at,
         la.finding_count, la.critical_count
  FROM repositories r
  LEFT JOIN LATERAL (
    SELECT a.score, a.finished_at,
           (SELECT count(*)::int FROM audit_findings f
            WHERE f.audit_id = a.id) AS finding_count,
           (SELECT count(*)::int FROM audit_findings f
            WHERE f.audit_id = a.id AND f.severity = 'critical') AS critical_count
    FROM audits a
    WHERE a.repository_id = r.id AND a.status = 'done'
    ORDER BY a.id DESC
    LIMIT 1
  ) la ON true`;

function handleError(err, res, next) {
  if (err instanceof GitHubError) {
    console.error(`GitHub error ${err.status}: ${err.message}`);

    if (err.status === 401) {
      return res
        .status(401)
        .json({ error: "GitHub session expired, please log in again" });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (err.status === 429) {
      return res
        .status(429)
        .json({ error: "GitHub rate limit reached, try again later" });
    }
    return res.status(502).json({ error: "GitHub request failed" });
  }
  next(err);
}

// GET /repos/github: repos on GitHub the user can pick from
// (must stay ABOVE "/:id", or "github" would be treated as an id)
router.get("/github", async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const token = await getGitHubToken(userId);
    if (!token)
      return res.status(401).json({ error: "No GitHub account linked" });

    const [ghRepos, selected] = await Promise.all([
      listUserRepos(token),
      query("SELECT github_repo_id FROM repositories WHERE user_id = $1", [
        userId,
      ]),
    ]);

    const selectedIds = new Set(
      selected.rows.map((r) => Number(r.github_repo_id)),
    );

    res.json(
      ghRepos.map((r) => ({
        githubRepoId: r.id,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        updatedAt: r.updated_at,
        defaultBranch: r.default_branch,
        url: r.html_url,
        selected: selectedIds.has(r.id),
      })),
    );
  } catch (err) {
    handleError(err, res, next);
  }
});

// GET /repos: all selected repos
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      `${REPO_WITH_SCORE}
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.session.userId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /repos/:id: one selected repo
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const { rows } = await query(
      `${REPO_WITH_SCORE}
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, req.session.userId],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Repository not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /repos: select a repo { "githubRepoId": 123 }
router.post("/", async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const githubRepoId = Number(req.body.githubRepoId);

    if (!Number.isSafeInteger(githubRepoId) || githubRepoId <= 0) {
      return res
        .status(400)
        .json({ error: "githubRepoId must be a positive integer" });
    }

    const token = await getGitHubToken(userId);
    if (!token)
      return res.status(401).json({ error: "No GitHub account linked" });

    const repo = await githubFetch(token, `/repositories/${githubRepoId}`);

    if (repo.private) {
      return res
        .status(403)
        .json({ error: "Private repositories are not supported yet" });
    }

    const { rows } = await query(
      `INSERT INTO repositories (user_id, github_repo_id, full_name, default_branch, is_private)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, github_repo_id)
       DO UPDATE SET full_name = EXCLUDED.full_name,
                     default_branch = EXCLUDED.default_branch,
                     is_private = EXCLUDED.is_private
       RETURNING id, github_repo_id, full_name, default_branch`,
      [userId, repo.id, repo.full_name, repo.default_branch, repo.private],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    handleError(err, res, next);
  }
});

// DELETE /repos/:id: remove a selected repo (and its webhook, if monitoring was on)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const userId = req.session.userId;
    const { rows } = await query(
      "SELECT full_name, webhook_id FROM repositories WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Repository not found" });

    await deleteWebhook(userId, rows[0].full_name, rows[0].webhook_id);
    await query("DELETE FROM repositories WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
