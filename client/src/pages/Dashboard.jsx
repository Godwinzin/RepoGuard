import { Link } from "react-router-dom";
import { useApi } from "../useApi";
import ScoreRing from "../components/ScoreRing";
import Stat from "../components/Stat";
import RepoAvatar from "../components/RepoAvatar";
import { ErrorState } from "../components/ErrorState";
import { RepoCardSkeleton, Skeleton, StatSkeleton } from "../components/Skeleton";
import { AlertIcon, ArrowRightIcon, ClockIcon, FolderIcon, GaugeIcon, ShieldIcon } from "../components/icons";
import { splitName, timeAgo } from "../format";
import { usePageTitle } from "../usePageTitle";

function scoreTone(score) {
  if (score === null) return "neutral";
  return score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
}

export default function Dashboard() {
  const { data: repos, error, loading, reload } = useApi("/repos");
   usePageTitle("Repositories");

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="stack">
            <Skeleton width={200} height={30} />
            <Skeleton width={280} height={14} />
          </div>
        </div>
        <div className="stats">
          {[1, 2, 3, 4].map((n) => (
            <StatSkeleton key={n} />
          ))}
        </div>
        <div className="grid">
          {[1, 2, 3].map((n) => (
            <RepoCardSkeleton key={n} />
          ))}
        </div>
      </>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} showHome={false} />;

  const audited = repos.filter((r) => r.latest_score !== null);
  const average = audited.length
    ? Math.round(audited.reduce((sum, r) => sum + r.latest_score, 0) / audited.length)
    : null;
  const totalProblems = repos.reduce((sum, r) => sum + (r.finding_count ?? 0), 0);
  const totalCritical = repos.reduce((sum, r) => sum + (r.critical_count ?? 0), 0);
  const needAttention = repos.filter(
    (r) => r.critical_count > 0 || (r.latest_score !== null && r.latest_score < 50)
  ).length;

  let summary = "Run an audit to see how your repositories are doing.";
  if (audited.length > 0) {
    summary =
      needAttention > 0
        ? `${needAttention} ${needAttention === 1 ? "repository needs" : "repositories need"} attention.`
        : "Everything looks healthy.";
  }

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1>Repositories</h1>
          <p className="subtitle">{summary}</p>
        </div>
        <Link to="/repos/add" className="btn btn-primary btn-md">
          Add repository
        </Link>
      </div>

      {repos.length === 0 ? (
        <div className="state-box">
          <div className="state-icon">
            <ShieldIcon size={28} />
          </div>
          <h2>No repositories yet</h2>
          <p>Add your first repository to see how healthy it is.</p>
          <div className="state-actions">
            <Link to="/repos/add" className="btn btn-primary btn-md">
              Add repository
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="stats">
            <Stat icon={<FolderIcon />} tone="blue" value={repos.length} label="Repositories" />
            <Stat
              icon={<GaugeIcon />}
              tone={scoreTone(average)}
              value={average ?? "—"}
              label="Average score"
            />
            <Stat
              icon={<AlertIcon />}
              tone={audited.length === 0 ? "neutral" : totalProblems > 0 ? "warn" : "good"}
              value={audited.length === 0 ? "—" : totalProblems}
              label="Open problems"
            />
            <Stat
              icon={<AlertIcon />}
              tone={audited.length === 0 ? "neutral" : totalCritical > 0 ? "bad" : "good"}
              value={audited.length === 0 ? "—" : totalCritical}
              label="Critical issues"
            />
          </div>

          <div className="grid">
            {repos.map((repo) => {
              const { owner, name } = splitName(repo.full_name);
              const hasScore = repo.latest_score !== null;

              return (
                <Link key={repo.id} to={`/repos/${repo.id}`} className="repo-card">
                  <div className="repo-card-head">
                    <RepoAvatar name={name} />
                    <div className="repo-card-name">
                      <span className="repo-title">{name}</span>
                      <span className="repo-owner">{owner}</span>
                    </div>
                    <span className="repo-card-arrow">
                      <ArrowRightIcon size={18} />
                    </span>
                  </div>

                  <div className="repo-card-body">
                    <ScoreRing score={repo.latest_score} size={52} />
                    <div className="repo-card-summary">
                      {hasScore ? (
                        <>
                          <span className="repo-card-count">
                            {repo.finding_count}{" "}
                            <small>{repo.finding_count === 1 ? "problem" : "problems"}</small>
                          </span>
                          {repo.critical_count > 0 ? (
                            <span className="pill pill-danger">{repo.critical_count} critical</span>
                          ) : (
                            <span className="pill pill-success">No critical issues</span>
                          )}
                        </>
                      ) : (
                        <span className="muted-small">Run an audit to get a score.</span>
                      )}
                    </div>
                  </div>

                  <div className="repo-card-foot">
                    <span className={`chip ${repo.monitoring_enabled ? "chip-on" : ""}`}>
                      <span className="dot" />
                      {repo.monitoring_enabled ? "Monitoring on" : "Monitoring off"}
                    </span>
                    <span className="muted-small time">
                      <ClockIcon size={13} />
                      {repo.last_audited_at ? timeAgo(repo.last_audited_at) : "Never audited"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}