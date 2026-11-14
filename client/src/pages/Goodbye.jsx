import { Link, useLocation } from "react-router-dom";
import { usePageTitle } from "../usePageTitle";
import { ShieldIcon } from "../components/icons";
import { useEffect } from "react";
import { useAuth } from "../auth/useAuth";

export default function Goodbye() {
  const { state } = useLocation();
  usePageTitle("Account deleted");
  const { forget } = useAuth();

  // We only arrive here with state after a real deletion. A direct visit has none,
  // so someone who is still logged in is not logged out of the interface by mistake.
  useEffect(() => {
    if (state) forget();
  }, [state, forget]);

  const revoked = state?.githubRevoked;
  const failedHooks = Array.isArray(state?.webhooksFailed)
    ? state.webhooksFailed
    : [];

  return (
    <div className="state-box goodbye">
      <div className="state-icon">
        <ShieldIcon size={28} />
      </div>
      <h1>Your account has been deleted</h1>
      <p>
        Your RepoGuard data was removed. Your repositories on GitHub were never
        touched.
      </p>

      <ul className="goodbye-list">
        {revoked === true && (
          <li>RepoGuard's access to your GitHub account was revoked.</li>
        )}

        {revoked === false && (
          <li className="goodbye-warn">
            We couldn't revoke RepoGuard's access automatically. Please do it
            yourself on GitHub: Settings, Applications, Authorized OAuth Apps,
            RepoGuard, Revoke.{" "}
            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open that page
            </a>
            .
          </li>
        )}

        {failedHooks.length > 0 && (
          <li className="goodbye-warn">
            We couldn't remove our webhook from: {failedHooks.join(", ")}. You
            can delete it under each repository's Settings, Webhooks. It does
            nothing now either way.
          </li>
        )}
      </ul>

      <div className="state-actions">
        <Link to="/" className="btn btn-primary btn-md">
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
