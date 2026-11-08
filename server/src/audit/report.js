import { query } from "../db/pool.js";
import { compareFindings } from "./compare.js";

// These are constants, never user input, so building SQL from them is safe.
const FINDING_COLUMNS =
  "rule_id, category, severity, title, message, fix, file_path, fingerprint, accepted, accepted_reason";
const SEVERITY_ORDER = `CASE severity
  WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3
  WHEN 'low' THEN 4 ELSE 5 END`;

async function loadFindings(auditId) {
  const { rows } = await query(
    `SELECT ${FINDING_COLUMNS}
     FROM audit_findings
     WHERE audit_id = $1
     ORDER BY ${SEVERITY_ORDER}, id`,
    [auditId]
  );
  return rows;
}

export async function loadAudit(auditId) {
  const { rows } = await query(
    `SELECT a.id, a.repository_id, r.full_name, a.commit_sha, a.status, a.score,
            a.error_message, a.error_code, a.created_at, a.started_at, a.finished_at
     FROM audits a
     JOIN repositories r ON r.id = a.repository_id
     WHERE a.id = $1`,
    [auditId]
  );
  const audit = rows[0];
  if (!audit) return null;

  const findings = await loadFindings(auditId);
  const acceptedCount = findings.filter((f) => f.accepted).length;

  // Only finished audits can be compared or managed
  if (audit.status !== "done") {
    return { ...audit, isLatest: false, acceptedCount, findings, comparison: null };
  }

  // Risks can only be accepted or restored on a repository's latest finished audit
  const newer = await query(
    `SELECT 1 FROM audits
     WHERE repository_id = $1 AND status = 'done' AND id > $2
     LIMIT 1`,
    [audit.repository_id, auditId]
  );
  const isLatest = newer.rowCount === 0;

  // The most recent finished audit of the same repository before this one
  const previousRes = await query(
    `SELECT id, score
     FROM audits
     WHERE repository_id = $1 AND status = 'done' AND id < $2
     ORDER BY id DESC
     LIMIT 1`,
    [audit.repository_id, auditId]
  );
  const previous = previousRes.rows[0];

  // First audit of this repository: nothing to compare with
  if (!previous) {
    return { ...audit, isLatest, acceptedCount, findings, comparison: null };
  }

  const previousFindings = await loadFindings(previous.id);
  const { added, unchanged, fixed } = compareFindings(previousFindings, findings);
  const addedFingerprints = new Set(added.map((f) => f.fingerprint));

  return {
    ...audit,
    isLatest,
    acceptedCount,
    findings: findings.map((f) => ({
      ...f,
      change: addedFingerprints.has(f.fingerprint) ? "new" : "unchanged",
    })),
    comparison: {
      previousAuditId: previous.id,
      previousScore: previous.score,
      scoreChange: audit.score - previous.score,
      // Accepted problems are known decisions, so they aren't "new" or "still open"
      newCount: added.filter((f) => !f.accepted).length,
      unchangedCount: unchanged.filter((f) => !f.accepted).length,
      fixedCount: fixed.length,
      fixed: fixed.map(({ rule_id, severity, title, file_path, fingerprint }) => ({
        rule_id,
        severity,
        title,
        file_path,
        fingerprint,
      })),
    },
  };
}