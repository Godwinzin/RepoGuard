import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../useApi";
import { useAuth } from "../auth/useAuth";
import { usePageTitle } from "../usePageTitle";
import Stat from "../components/Stat";
import TrendChart from "../components/TrendChart";
import ActivityFeed from "../components/ActivityFeed";
import RepoTable from "../components/RepoTable";
import { ErrorState } from "../components/ErrorState";
import { Skeleton, StatSkeleton } from "../components/Skeleton";
import { AlertIcon, EyeIcon, FolderIcon, GaugeIcon, ShieldIcon } from "../components/icons";
import { greeting, statusOf } from "../format";

function scoreTone(score) {
  if (score === null) return "neutral";
  return score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
}

// Change between the first and last day that had audit data
function trendChange(points, key) {
  const valid = points.filter((p) => p.audited > 0 && p[key] !== null);
  if (valid.length < 2) return null;
  return valid[valid.length - 1][key] - valid[0][key];
}

function makeDelta(change, { goodWhen, unit = "", note }) {
  if (change === null) return null;
  if (change === 0) return { arrow: "→", text: "No change", tone: "neutral", note };

  const up = change > 0;
  const good = goodWhen === "up" ? up : !up;
  return {
    arrow: up ? "↑" : "↓",
    text: `${up ? "+" : ""}${change}${unit}`,
    tone: good ? "good" : "bad",
    note,
  };
}

function DashboardSkeleton() {
  return (
    <>
      <div className="overview-head">
        <div className="stack">
          <Skeleton width={320} height={34} />
          <Skeleton width={260} height={14} />
        </div>
      </div>
      <div className="stats">
        {[1, 2, 3, 4].map((n) => (
          <StatSkeleton key={n} />
        ))}
      </div>
      <div className="overview-grid">
        <Skeleton height={330} radius="14px" />
        <Skeleton height={330} radius="14px" />
      </div>
      <Skeleton height={260} radius="14px" />
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const repos = useApi("/repos");
  const [days, setDays] = useState(30);
  const trend = useApi(`/stats/trend?days=${days}`);
  const activity = useApi("/activity?limit=6");
  const [hello] = useState(() => greeting()); // chosen once, when the page opens
  usePageTitle("Overview");

  if (repos.loading) return <DashboardSkeleton />;
  if (repos.error) return <ErrorState error={repos.error} onRetry={repos.reload} showHome={false} />;

  const list = repos.data;
  const audited = list.filter((r) => r.latest_score !== null);
  const average = audited.length
    ? Math.round(audited.reduce((sum, r) => sum + r.latest_score, 0) / audited.length)
    : null;
  const totalProblems = list.reduce((sum, r) => sum + (r.finding_count ?? 0), 0);
  const totalCritical = list.reduce((sum, r) => sum + (r.critical_count ?? 0), 0);
  const monitored = list.filter((r) => r.monitoring_enabled).length;
  const needAttention = list.filter((r) => ["attention", "risk"].includes(statusOf(r).key)).length;

  const points = trend.data?.points ?? [];
  const since = points[0]?.day;
  const note = `vs ${days} days ago`;
  const added = since ? list.filter((r) => r.created_at.slice(0, 10) >= since).length : 0;

  const firstName = (user.name || user.login).split(" ")[0];

  let summary = "Run an audit to see how your repositories are doing.";
  if (audited.length > 0) {
    summary =
      needAttention > 0
        ? `${needAttention} ${needAttention === 1 ? "repository needs" : "repositories need"} attention${
            totalCritical > 0 ? `, with ${totalCritical} critical ${totalCritical === 1 ? "issue" : "issues"}` : ""
          }.`
        : "Everything looks healthy. Here's the health of your repositories.";
  }

  if (list.length === 0) {
    return (
      <>
        <div className="overview-head">
          <div>
            <h1>
              {hello}, {firstName}
            </h1>
            <p className="subtitle">Let's get your first repository audited.</p>
          </div>
        </div>
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
      </>
    );
  }

  return (
    <>
      <div className="overview-head">
        <div>
          <h1>
            {hello}, {firstName}
          </h1>
          <p className="subtitle">{summary}</p>
        </div>
        <Link to="/repos/add" className="btn btn-primary btn-md">
          Add repository
        </Link>
      </div>

      <div className="stats">
        <Stat
          icon={<FolderIcon />}
          tone="blue"
          label="Repositories"
          value={list.length}
          delta={added > 0 ? { arrow: "↑", text: `+${added}`, tone: "neutral", note: `in ${days} days` } : null}
        />
        <Stat
          icon={<GaugeIcon />}
          tone={scoreTone(average)}
          label="Average health"
          value={
            average === null ? (
              "—"
            ) : (
              <>
                {average}
                <small>/100</small>
              </>
            )
          }
          delta={makeDelta(trendChange(points, "avg_score"), { goodWhen: "up", unit: " pts", note })}
        />
        <Stat
          icon={<AlertIcon />}
          tone={audited.length === 0 ? "neutral" : totalProblems > 0 ? "warn" : "good"}
          label="Open problems"
          value={audited.length === 0 ? "—" : totalProblems}
          delta={makeDelta(trendChange(points, "problems"), { goodWhen: "down", note })}
        />
        <Stat
          icon={<EyeIcon />}
          tone={monitored > 0 ? "good" : "neutral"}
          label="Monitoring"
          value={`${monitored} active`}
        />
      </div>

      <div className="overview-grid">
        <section className="panel panel-pad">
          <div className="panel-head">
            <h2>Health trend</h2>
            <select
              className="select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Time range"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {trend.loading ? (
            <Skeleton height={260} radius="10px" />
          ) : trend.error ? (
            <p className="muted-small">{trend.error.message}</p>
          ) : (
            <TrendChart points={points} />
          )}
        </section>

        <section className="panel panel-pad">
          <div className="panel-head">
            <h2>Recent activity</h2>
          </div>
          {activity.loading ? (
            <Skeleton height={260} radius="10px" />
          ) : activity.error ? (
            <p className="muted-small">{activity.error.message}</p>
          ) : (
            <ActivityFeed items={activity.data} />
          )}
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <h2>Your repositories</h2>
          <Link to="/repositories" className="panel-link">
            View all →
          </Link>
        </div>
        <RepoTable repos={list.slice(0, 5)} />
      </section>
    </>
  );
}