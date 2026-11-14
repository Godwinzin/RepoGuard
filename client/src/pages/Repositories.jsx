import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../useApi";
import { usePageTitle } from "../usePageTitle";
import RepoTable from "../components/RepoTable";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { SearchIcon, ShieldIcon } from "../components/icons";
import { statusOf } from "../format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "healthy", label: "Healthy" },
  { key: "none", label: "Not audited" },
];

function inFilter(repo, filter) {
  const key = statusOf(repo).key;
  if (filter === "all") return true;
  if (filter === "attention") return key === "attention" || key === "risk";
  return key === filter;
}

export default function Repositories() {
  const { data: repos, error, loading, reload } = useApi("/repos");
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  usePageTitle("Repositories");

  // The search text lives in the address bar, so the top bar's search box can fill it in
  const q = params.get("q") ?? "";

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="stack">
            <Skeleton width={220} height={30} />
            <Skeleton width={160} height={14} />
          </div>
        </div>
        <Skeleton height={44} radius="12px" className="mb" />
        <Skeleton height={300} radius="14px" />
      </>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;

  const needle = q.trim().toLowerCase();
  const matchesSearch = (r) => !needle || r.full_name.toLowerCase().includes(needle);
  const visible = repos.filter((r) => matchesSearch(r) && inFilter(r, filter));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Repositories</h1>
          <p className="subtitle">
            {repos.length} {repos.length === 1 ? "repository" : "repositories"} connected.
          </p>
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
        </div>
      ) : (
        <>
          <div className="search">
            <SearchIcon size={18} />
            <input
              type="search"
              placeholder="Search repositories…"
              aria-label="Search repositories"
              value={q}
              onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
            />
          </div>

          <div className="filters">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`filter-chip ${filter === key ? "filter-chip-active" : ""}`}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
              >
                {label}
                <span className="filter-count">
                  {repos.filter((r) => matchesSearch(r) && inFilter(r, key)).length}
                </span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="state-box">
              <h2>No matches</h2>
              <p>Try a different search or filter.</p>
            </div>
          ) : (
            <section className="panel table-panel">
              <RepoTable repos={visible} />
            </section>
          )}
        </>
      )}
    </>
  );
}