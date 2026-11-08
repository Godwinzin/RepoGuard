import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../useApi";
import { useToast } from "../toast/useToast";
import Button from "../components/Button";
import ScoreRing from "../components/ScoreRing";
import ScoreBadge from "../components/ScoreBadge";
import Stat from "../components/Stat";
import RepoAvatar from "../components/RepoAvatar";
import MonitoringCard from "../components/MonitoringCard";
import { ErrorState } from "../components/ErrorState";
import { Skeleton, StatSkeleton } from "../components/Skeleton";
import { AlertIcon, ClockIcon, PlayIcon } from "../components/icons";
import { formatDate, splitName, timeAgo } from "../format";
import { usePageTitle } from "../usePageTitle";
import AcceptedRisks from "../components/AcceptedRisks";

function RepoDetailSkeleton() {
  return (
    <>
      <Skeleton width={120} height={14} className="mb" />
      <div className="detail-head">
        <div className="detail-id">
          <Skeleton width={56} height={56} radius="16px" />
          <div className="stack">
            <Skeleton width={90} height={12} />
            <Skeleton width={220} height={28} />
          </div>
        </div>
        <Skeleton width={130} height={44} radius="10px" />
      </div>
      <div className="stats">
        {[1, 2, 3, 4].map((n) => (
          <StatSkeleton key={n} />
        ))}
      </div>
      <Skeleton height={240} radius="14px" />
    </>
  );
}

export default function RepoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const repo = useApi(`/repos/${id}`);
  const audits = useApi(`/repos/${id}/audits`);
  usePageTitle(repo.data ? repo.data.full_name : "Repository");

  const [running, setRunning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function runAudit() {
    setRunning(true);

    try {
      // Returns immediately with a queued audit (or the one already running)
      const audit = await api(`/repos/${id}/audits`, { method: "POST" });
      navigate(`/audits/${audit.id}`);
    } catch (err) {
      toast.error(err.message);
      setRunning(false);
    }
  }

  async function removeRepo() {
    setRemoving(true);

    try {
      await api(`/repos/${id}`, { method: "DELETE" });
      toast.success("Repository removed.");
      navigate("/");
    } catch (err) {
      toast.error(err.message);
      setRemoving(false);
      setConfirming(false);
    }
  }

  if (repo.loading || audits.loading) return <RepoDetailSkeleton />;

  const error = repo.error || audits.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          repo.reload();
          audits.reload();
        }}
      />
    );
  }

  const r = repo.data;
  const { owner, name } = splitName(r.full_name);
  const hasScore = r.latest_score !== null;

  return (
    <>
      <Link to="/" className="back-link">
        ← All repositories
      </Link>

      <header className="detail-head">
        <div className="detail-id">
          <RepoAvatar name={name} size={56} />
          <div>
            <span className="repo-owner">{owner}</span>
            <h1>{name}</h1>
            <div className="meta-row">
              <span className="chip">
                Branch <code>{r.default_branch}</code>
              </span>
              <a
                href={`https://github.com/${r.full_name}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub ↗
              </a>
            </div>
          </div>
        </div>

        <div className="detail-actions">
          {confirming ? (
            <div className="confirm">
              <span>Remove this repository and its history?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={removeRepo}
                loading={removing}
              >
                Yes, remove
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setConfirming(true)}
                disabled={running}
              >
                Remove
              </Button>
              <Button size="lg" onClick={runAudit} loading={running}>
                <PlayIcon size={16} /> Run audit
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <ScoreRing score={r.latest_score} size={52} />
          <div>
            <div className="stat-value">
              {hasScore ? r.latest_score : "—"}
              {hasScore && <small>/100</small>}
            </div>
            <div className="stat-label">Health score</div>
          </div>
        </div>
        <Stat
          icon={<AlertIcon />}
          tone={!hasScore ? "neutral" : r.finding_count > 0 ? "warn" : "good"}
          value={hasScore ? r.finding_count : "—"}
          label="Open problems"
        />
        <Stat
          icon={<AlertIcon />}
          tone={!hasScore ? "neutral" : r.critical_count > 0 ? "bad" : "good"}
          value={hasScore ? r.critical_count : "—"}
          label="Critical issues"
        />
        <Stat
          icon={<ClockIcon />}
          tone="blue"
          value={timeAgo(r.last_audited_at)}
          label="Last audit"
        />
      </div>

      <div className="detail-grid">
        <section className="detail-main">
          <h2 className="section-title">Audit history</h2>

          {audits.data.length === 0 ? (
            <div className="state-box">
              <h2>No audits yet</h2>
              <p>Run your first audit to see how this repository is doing.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-stack">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Problems</th>
                    <th>Critical</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {audits.data.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Date">{formatDate(a.created_at)}</td>
                      <td data-label="Status">
                        <span className={`status status-${a.status}`}>
                          {a.status}
                        </span>
                      </td>
                      <td data-label="Score">
                        {a.status === "done" ? (
                          <ScoreBadge score={a.score} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Problems">
                        {a.status === "done" ? a.finding_count : "—"}
                      </td>
                      <td data-label="Critical">
                        {a.status === "done" ? a.critical_count : "—"}
                      </td>
                      <td>
                        <Link to={`/audits/${a.id}`}>View report</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="detail-side">
          <MonitoringCard
            repoId={id}
            branch={r.default_branch}
            initialEnabled={r.monitoring_enabled}
            onChanged={audits.reload}
          />
          <AcceptedRisks
            repoId={id}
            onChanged={() => {
              repo.reload();
              audits.reload();
            }}
          />
        </aside>
      </div>
    </>
  );
}
