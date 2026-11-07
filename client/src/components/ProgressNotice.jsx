import { Link } from "react-router-dom";

function formatWait(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export default function ProgressNotice({ status, waited, repositoryId }) {
  const slow = waited >= 45;
  const veryLate = waited >= 180;

  return (
    <>
      <div className="callout">
        <span className="spinner" />
        <div>
          <strong>{status === "queued" ? "Waiting to start…" : "Audit in progress…"}</strong>
          <p className="muted-small">
            Running for {formatWait(waited)}. This page updates automatically.
          </p>
        </div>
      </div>

      {slow && !veryLate && (
        <div className="callout callout-warn">
          <div>
            <strong>This is taking longer than usual</strong>
            <p>
              Larger repositories can take a couple of minutes. You can safely leave this
              page: the audit keeps running, and the result will appear in the repository's
              history.
            </p>
          </div>
        </div>
      )}

      {veryLate && (
        <div className="callout callout-warn">
          <div>
            <strong>This audit is taking much longer than expected</strong>
            <p>
              Something may be wrong. Audits are stopped automatically after a few minutes.
              Go back to the repository, wait a minute or two, and run the audit again. If it
              keeps happening, check that the repository still exists and is public.
            </p>
            <div className="callout-actions">
              <Link to={`/repos/${repositoryId}`} className="btn btn-secondary btn-sm">
                Back to repository
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}