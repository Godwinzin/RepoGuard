import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../toast/useToast";
import Button from "./Button";
import HealthBar from "./HealthBar";
import RepoAvatar from "./RepoAvatar";
import { splitName, statusOf, timeAgo } from "../format";

export default function RepoTable({ repos }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [runningId, setRunningId] = useState(null);

  // The same call as the Run audit button on a repository's page
  async function audit(repo) {
    setRunningId(repo.id);

    try {
      const result = await api(`/repos/${repo.id}/audits`, { method: "POST" });
      navigate(`/audits/${result.id}`);
    } catch (err) {
      toast.error(err.message);
      setRunningId(null);
    }
  }

  return (
    <div className="table-wrap">
      <table className="table-stack repo-table">
        <thead>
          <tr>
            <th>Repository</th>
            <th>Branch</th>
            <th>Health score</th>
            <th>Last audited</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => {
            const { owner, name } = splitName(repo.full_name);
            const status = statusOf(repo);

            return (
              <tr key={repo.id}>
                <td>
                  <Link to={`/repos/${repo.id}`} className="repo-cell">
                    <RepoAvatar name={name} size={36} />
                    <span className="repo-cell-text">
                      <span className="repo-cell-name">
                        {name}
                        {repo.monitoring_enabled && (
                          <span className="mini-dot" title="Monitoring is on" />
                        )}
                      </span>
                      <span className="repo-owner">{owner}</span>
                    </span>
                  </Link>
                </td>
                <td data-label="Branch">
                  <span className="chip">{repo.default_branch}</span>
                </td>
                <td data-label="Health score">
                  <HealthBar score={repo.latest_score} />
                </td>
                <td data-label="Last audited" className="muted-cell">
                  {repo.last_audited_at
                    ? timeAgo(repo.last_audited_at)
                    : "Never"}
                </td>
                <td data-label="Status">
                  <span className={`status-chip status-chip-${status.key}`}>
                    {status.label}
                  </span>
                </td>
                <td className="actions-cell">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => audit(repo)}
                    loading={runningId === repo.id}
                    disabled={runningId !== null}
                  >
                    Audit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
