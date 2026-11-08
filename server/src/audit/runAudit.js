import { pool, query } from "../db/pool.js";
import {
  GitHubError,
  describeGitHubError,
  getGitHubToken,
  getRepoSnapshot,
} from "../services/github.js";
import { buildContext } from "./context.js";
import { notifyAboutNewProblems } from "./notify.js";
import { structureRules } from "./rules/structure.js";
import { projectRules } from "./rules/project.js";
import { readmeRules } from "./rules/readme.js";
import { dependencyRules } from "./rules/dependencies.js";
import { secretRules } from "./rules/secrets.js";
import { calculateScore } from "./score.js";

const rules = [
  ...structureRules,
  ...projectRules,
  ...readmeRules,
  ...dependencyRules,
  ...secretRules,
];

// An audit running longer than this is cancelled. One stuck in queued/running for longer
// than STALE_AFTER_MINUTES is failed automatically when someone requests a new one.
const AUDIT_TIME_LIMIT_MS = 120_000;
const STALE_AFTER_MINUTES = 5;

class AuditTimeoutError extends Error {}

// Called by the API route: just records the request. Fast.
export async function createAudit(repositoryId, triggeredBy = "manual") {
  await query(
    `UPDATE audits
     SET status = 'failed',
         error_message = 'This audit took too long and was stopped. Please run it again.',
         error_code = 'timeout',
         finished_at = now()
     WHERE repository_id = $1
       AND status IN ('queued', 'running')
       AND created_at < now() - make_interval(mins => $2)`,
    [repositoryId, STALE_AFTER_MINUTES]
  );

  try {
    const { rows } = await query(
      "INSERT INTO audits (repository_id, status, triggered_by) VALUES ($1, 'queued', $2) RETURNING id",
      [repositoryId, triggeredBy]
    );
    return { id: rows[0].id, existing: false };
  } catch (err) {
    // 23505 = unique violation: an audit is already queued or running
    if (err.code === "23505") {
      const { rows } = await query(
        `SELECT id FROM audits
         WHERE repository_id = $1 AND status IN ('queued', 'running')
         LIMIT 1`,
        [repositoryId]
      );
      if (rows[0]) return { id: rows[0].id, existing: true };
    }
    throw err;
  }
}

// The actual checks. Returns findings; saves nothing.
async function runChecks(audit, auditId, signal) {
  const token = await getGitHubToken(audit.user_id);
  if (!token) throw new GitHubError(401, "GitHub account not linked");

  const startedAt = Date.now();
  const snapshot = await getRepoSnapshot(token, audit.full_name, audit.default_branch, signal);
  console.log(`[audit ${auditId}] file list loaded in ${Date.now() - startedAt}ms`);

  const ctx = buildContext({
    token,
    fullName: audit.full_name,
    defaultBranch: audit.default_branch,
    snapshot,
    signal,
  });

  const results = await Promise.allSettled(
    rules.map(async (rule) => {
      const ruleStart = Date.now();
      try {
        return await rule.run(ctx);
      } finally {
        console.log(`[audit ${auditId}] ${rule.id} took ${Date.now() - ruleStart}ms`);
      }
    })
  );

  // Never keep partial results from a cancelled audit
  signal.throwIfAborted();

  const findings = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      findings.push(...result.value);
    } else {
      console.error(`Rule ${rules[i].id} crashed:`, result.reason?.message);
    }
  });

  return { snapshot, findings };
}

// Called by the worker: runs the audit and saves the outcome. Slow.
export async function processAudit(auditId) {
  const { rows } = await query(
    `SELECT a.status, a.triggered_by, r.id AS repository_id,
            r.full_name, r.default_branch, r.user_id
     FROM audits a
     JOIN repositories r ON r.id = a.repository_id
     WHERE a.id = $1`,
    [auditId]
  );
  const audit = rows[0];

  // Repo deleted meanwhile, or this job was delivered twice: do nothing
  if (!audit || !["queued", "running"].includes(audit.status)) return;

  await query(
    "UPDATE audits SET status = 'running', started_at = now() WHERE id = $1",
    [auditId]
  );

  // One controller per audit: aborting it cancels every request this audit has in flight
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new AuditTimeoutError("Audit time limit reached")),
    AUDIT_TIME_LIMIT_MS
  );

  try {
    const { snapshot, findings } = await runChecks(audit, auditId, controller.signal);
    clearTimeout(timer);

       // Apply the risks this repository has already accepted
    const acceptedRes = await query(
      "SELECT fingerprint, reason FROM accepted_findings WHERE repository_id = $1",
      [audit.repository_id]
    );
    const acceptedByFingerprint = new Map(acceptedRes.rows.map((r) => [r.fingerprint, r.reason]));

    for (const f of findings) {
      f.accepted = acceptedByFingerprint.has(f.fingerprint);
      f.acceptedReason = acceptedByFingerprint.get(f.fingerprint) ?? null;
    }

    const score = calculateScore(findings); // accepted findings are skipped inside

    // Findings and final status are saved together
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const f of findings) {
        await client.query(
          `INSERT INTO audit_findings
             (audit_id, rule_id, category, severity, title, message, fix, file_path,
              fingerprint, accepted, accepted_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            auditId, f.ruleId, f.category, f.severity, f.title, f.message, f.fix,
            f.filePath, f.fingerprint, f.accepted, f.acceptedReason,
          ]
        );
      }
      await client.query(
        `UPDATE audits
         SET status = 'done', score = $1, commit_sha = $2, finished_at = now()
         WHERE id = $3`,
        [score, snapshot.commitSha, auditId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Only push-triggered audits notify. A failure here must not mark the audit as failed.
    if (audit.triggered_by === "push") {
      try {
        await notifyAboutNewProblems({
          auditId,
          userId: audit.user_id,
          repositoryId: audit.repository_id,
          fullName: audit.full_name,
        });
      } catch (err) {
        console.error("Notification failed:", err.message);
      }
    }
  } catch (err) {
    console.error(`Audit ${auditId} failed:`, err.message);

    const timedOut =
      controller.signal.aborted && controller.signal.reason instanceof AuditTimeoutError;

    let code = "unexpected";
    let message = "Something went wrong while running the audit. Please try again.";

    if (timedOut) {
      code = "timeout";
      message =
        "This audit took too long and was stopped. Large repositories can take a while. Please try again in a few minutes.";
    } else if (err instanceof GitHubError) {
      ({ code, message } = describeGitHubError(err));
    }

    await query(
      `UPDATE audits
       SET status = 'failed', error_message = $1, error_code = $2, finished_at = now()
       WHERE id = $3`,
      [message, code, auditId]
    );
  } finally {
    clearTimeout(timer);
  }
}