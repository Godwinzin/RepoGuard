import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../useApi";
import { useToast } from "../toast/useToast";
import Button from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import { RowSkeleton, Skeleton } from "../components/Skeleton";

export default function AddRepos() {
  const { data: repos, error, loading, reload } = useApi("/repos/github");
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  async function add(repo) {
    setAddingId(repo.githubRepoId);

    try {
      const created = await api("/repos", {
        method: "POST",
        body: { githubRepoId: repo.githubRepoId },
      });
      toast.success(`${repo.fullName} was added.`);
      navigate(`/repos/${created.id}`);
    } catch (err) {
      toast.error(err.message);
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="stack">
            <Skeleton width={240} height={30} />
            <Skeleton width={320} height={14} />
          </div>
        </div>
        <Skeleton height={44} radius="12px" className="mb" />
        <ul className="list">
          {[1, 2, 3, 4].map((n) => (
            <RowSkeleton key={n} />
          ))}
        </ul>
      </>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;

  const visible = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <>
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      <div className="page-header">
        <div>
          <h1>Add a repository</h1>
          <p className="subtitle">Choose one of your public repositories to audit.</p>
        </div>
      </div>

      <div className="search">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search your repositories…"
          aria-label="Search repositories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="state-box">
          <h2>{repos.length === 0 ? "No public repositories" : "No matches"}</h2>
          <p>
            {repos.length === 0
              ? "We couldn't find any public repositories on your account."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <ul className="list">
          {visible.map((repo) => (
            <li key={repo.githubRepoId} className="list-item">
              <div className="list-main">
                <strong>{repo.fullName}</strong>
                {repo.description && <p className="muted-small">{repo.description}</p>}
                <p className="muted-small">
                  {[repo.language, `★ ${repo.stars}`].filter(Boolean).join(" · ")}
                </p>
              </div>

              {repo.selected ? (
                <span className="chip chip-on">Added</span>
              ) : (
                <Button
                  size="sm"
                  loading={addingId === repo.githubRepoId}
                  disabled={addingId !== null}
                  onClick={() => add(repo)}
                >
                  Select
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}