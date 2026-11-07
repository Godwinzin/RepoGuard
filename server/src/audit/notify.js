import { query } from "../db/pool.js";
import { loadAudit } from "./report.js";

export async function notifyAboutNewProblems({ auditId, userId, repositoryId, fullName }) {
  const report = await loadAudit(auditId);

  // No previous audit to compare with, or nothing new: stay quiet
  if (!report?.comparison || report.comparison.newCount === 0) return;

  const { newCount, fixedCount, scoreChange } = report.comparison;
  const newFindings = report.findings.filter((f) => f.change === "new");

  const top = newFindings
    .slice(0, 3)
    .map((f) => `[${f.severity}] ${f.title}`)
    .join("; ");
  const more = newFindings.length > 3 ? ` (+${newFindings.length - 3} more)` : "";
  const sign = scoreChange >= 0 ? "+" : "";

  await query(
    `INSERT INTO notifications (user_id, repository_id, audit_id, title, body)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      repositoryId,
      auditId,
      `${newCount} new problem${newCount === 1 ? "" : "s"} in ${fullName}`,
      `${top}${more}. Score change: ${sign}${scoreChange}.${fixedCount ? ` ${fixedCount} fixed.` : ""}`,
    ]
  );
}