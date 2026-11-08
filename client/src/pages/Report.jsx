import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAudit } from "../useAudit";
import { useNow } from "../useNow";
import { usePageTitle } from "../usePageTitle";
import { useToast } from "../toast/useToast";
import ScoreRing from "../components/ScoreRing";
import SeverityBadge from "../components/SeverityBadge";
import FindingCard from "../components/FindingCard";
import ProgressNotice from "../components/ProgressNotice";
import AiSuggestions from "../components/AiSuggestions";
import Stat from "../components/Stat";
import { ErrorState } from "../components/ErrorState";
import { FindingSkeleton, Skeleton } from "../components/Skeleton";
import { formatDate, splitName } from "../format";

const SEVERITIES = ["critical", "high", "medium", "low", "info"];

function ReportSkeleton() {
  return (
    <>
      <Skeleton width={140} height={14} className="mb" />
      <div className="panel repo-header">
        <div className="stack" style={{ flex: 1 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="45%" height={28} />
          <Skeleton width="30%" height={14} />
        </div>
        <Skeleton width={84} height={84} radius="50%" />
      </div>
      {[1, 2, 3].map((n) => (
        <FindingSkeleton key={n} />
      ))}
    </>
  );
}

export default function Report() {
  const { auditId } = useParams();
  const { data: audit, error, loading, reload } = useAudit(auditId);
  const now = useNow(); // hooks always come before any early return
  const toast = useToast();

  const titleText = !audit
    ? "Report"
    : audit.status === "done"
      ? `Score ${audit.score} · ${audit.full_name}`
      : audit.status === "failed"
        ? `Audit failed · ${audit.full_name}`
        : `Auditing… · ${audit.full_name}`;
  usePageTitle(titleText);

  // Both handlers tell the card whether it worked, so the card knows when to close its form
  async function accept(finding, reason) {
    try {
      await api(`/repos/${audit.repository_id}/accepted-findings`, {
        method: "POST",
        body: { fingerprint: finding.fingerprint, reason },
      });
      toast.success("Risk accepted. It no longer counts against your score.");
      reload();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }

  async function restore(finding) {
    try {
      await api(
        `/repos/${audit.repository_id}/accepted-findings?fingerprint=${encodeURIComponent(finding.fingerprint)}`,
        { method: "DELETE" }
      );
      toast.success("Restored. It counts toward your score again.");
      reload();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }

  if (loading) return <ReportSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const inProgress = audit.status === "queued" || audit.status === "running";
  const comparison = audit.comparison;
  const { owner, name } = splitName(audit.full_name);
  const waited = Math.max(0, Math.floor((now - new Date(audit.created_at).getTime()) / 1000));

  // Accepting and restoring only make sense on a repository's latest finished audit
  const canManage = audit.status === "done" && audit.isLatest;
  const openFindings = audit.findings.filter((f) => !f.accepted);
  const acceptedFindings = audit.findings.filter((f) => f.accepted);

  const groups = SEVERITIES.map((severity) => ({
    severity,
    items: openFindings.filter((f) => f.severity === severity),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <Link to={`/repos/${audit.repository_id}`} className="back-link">
        ← Back to repository
      </Link>

      <div className="panel repo-header">
        <div>
          <span className="repo-owner">{owner}</span>
          <h1>{name}</h1>
          <p className="muted-small">
            Audit #{audit.id}
            {audit.commit_sha && ` · commit ${audit.commit_sha.slice(0, 7)}`}
            {audit.finished_at && ` · ${formatDate(audit.finished_at)}`}
          </p>
          {audit.status === "done" && audit.acceptedCount > 0 && (
            <p className="muted-small">
              {audit.acceptedCount} accepted {audit.acceptedCount === 1 ? "risk is" : "risks are"}{" "}
              not counted in this score.
            </p>
          )}
        </div>
        {audit.status === "done" && <ScoreRing score={audit.score} size={84} />}
      </div>

      {inProgress && (
        <ProgressNotice
          status={audit.status}
          waited={waited}
          repositoryId={audit.repository_id}
        />
      )}

      {audit.status === "failed" && (
        <div className="callout callout-error">
          <div>
            <strong>This audit couldn't be completed.</strong>
            <p>{audit.error_message ?? "Something went wrong. Please run it again."}</p>
            <div className="callout-actions">
              {audit.error_code === "github_auth" && (
                <a className="btn btn-primary btn-sm" href="/api/auth/github">
                  Reconnect GitHub
                </a>
              )}
              <Link to={`/repos/${audit.repository_id}`} className="btn btn-secondary btn-sm">
                Back to repository
              </Link>
            </div>
          </div>
        </div>
      )}

      {audit.status === "done" && (
        <>
          {comparison ? (
            <>
              <div className="stats">
                <Stat
                  value={`${comparison.scoreChange > 0 ? "+" : ""}${comparison.scoreChange}`}
                  label={`Score change (was ${comparison.previousScore})`}
                />
                <Stat value={comparison.newCount} label="New problems" />
                <Stat value={comparison.fixedCount} label="Fixed" />
                <Stat value={comparison.unchangedCount} label="Still open" />
              </div>

              {comparison.fixed.length > 0 && (
                <>
                  <h3 className="section-title">Fixed since the last audit</h3>
                  <ul className="fixed-list">
                    {comparison.fixed.map((f) => (
                      <li key={f.fingerprint}>
                        {f.title}
                        {f.file_path && (
                          <>
                            {" "}
                            (<code>{f.file_path}</code>)
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="muted-small">
              This is the first finished audit of this repository, so there is nothing to
              compare it with yet.
            </p>
          )}

          {!audit.isLatest && (
            <p className="muted-small">
              This is an older audit. Open the repository's latest audit to accept or restore
              risks.
            </p>
          )}

          {openFindings.length === 0 ? (
            <div className="state-box">
              <h2>{acceptedFindings.length > 0 ? "No open problems" : "No problems found"}</h2>
              <p>
                {acceptedFindings.length > 0
                  ? "Everything left on this report is an accepted risk."
                  : "This repository passed every check. Nice work."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.severity}>
                <h3 className="section-title section-title-sev">
                  <SeverityBadge severity={group.severity} />
                  <span>
                    {group.items.length} {group.items.length === 1 ? "problem" : "problems"}
                  </span>
                </h3>
                {group.items.map((f) => (
                  <FindingCard
                    key={f.fingerprint}
                    finding={f}
                    canManage={canManage}
                    onAccept={accept}
                    onRestore={restore}
                  />
                ))}
              </section>
            ))
          )}

          {acceptedFindings.length > 0 && (
            <details className="accepted-section">
              <summary>Accepted risks ({acceptedFindings.length})</summary>
              <p className="muted-small accepted-intro">
                These are excluded from the score.
                {canManage && " Restore one to count it again."}
              </p>
              {acceptedFindings.map((f) => (
                <FindingCard
                  key={f.fingerprint}
                  finding={f}
                  canManage={canManage}
                  onAccept={accept}
                  onRestore={restore}
                />
              ))}
            </details>
          )}

          <AiSuggestions auditId={audit.id} />
        </>
      )}
    </>
  );
}