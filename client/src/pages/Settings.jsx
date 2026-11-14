import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../useApi";
import { usePageTitle } from "../usePageTitle";
import { useToast } from "../toast/useToast";
import Button from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { TrashIcon } from "../components/icons";
import { formatDate } from "../format";

const SCOPE_LABELS = {
  "read:user": "Read your GitHub profile",
  "user:email": "Read your email address",
  "write:repo_hook": "Create repository webhooks",
  "admin:repo_hook": "Manage repository webhooks",
};

export default function Settings() {
  const { data: account, error, loading, reload } = useApi("/account");
  const navigate = useNavigate();
  const toast = useToast();
  usePageTitle("Settings");

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);

    try {
      const result = await api("/account", {
        method: "DELETE",
        body: { confirm: typed.trim() },
      });

      // The Goodbye page clears the login state itself, once it is on screen
      navigate("/goodbye", {
        replace: true,
        state: {
          githubRevoked: result.githubRevoked,
          webhooksFailed: result.webhooksFailed,
        },
      });
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="settings">
        <Skeleton width={160} height={30} className="mb" />
        <Skeleton height={170} radius="14px" className="mb" />
        <Skeleton height={130} radius="14px" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;

  const scopes = (account.scopes ?? "").split(/[,\s]+/).filter(Boolean);
  const matches = typed.trim().toLowerCase() === account.login.toLowerCase();

  return (
    <div className="settings">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Your account and your data.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Account</h2>
        <div className="account-head">
          <img src={account.avatar_url} alt="" className="avatar avatar-lg" />
          <div>
            <strong>{account.name || account.login}</strong>
            <p className="muted-small">
              @{account.login} · signed in with GitHub · since{" "}
              {formatDate(account.created_at)}
            </p>
          </div>
        </div>

        <h3 className="settings-sub">Permissions you granted</h3>
        <ul className="perm-list">
          {scopes.map((scope) => (
            <li key={scope}>{SCOPE_LABELS[scope] ?? scope}</li>
          ))}
        </ul>
        <p className="muted-small settings-note">
          RepoGuard cannot read your private repositories.{" "}
          <a
            href="https://github.com/settings/applications"
            target="_blank"
            rel="noopener noreferrer"
          >
            Review or revoke access on GitHub
          </a>
          .
        </p>
      </section>

      <section className="panel">
        <h2>Your data</h2>
        <div className="kv">
          <div className="kv-item">
            <strong>{account.repository_count}</strong>
            <span className="muted-small">Repositories</span>
          </div>
          <div className="kv-item">
            <strong>{account.monitored_count}</strong>
            <span className="muted-small">Monitored</span>
          </div>
          <div className="kv-item">
            <strong>{account.audit_count}</strong>
            <span className="muted-small">Audits</span>
          </div>
        </div>
        <p className="muted-small">
          See exactly what is stored and who else sees it in the{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section className="panel danger-zone">
        <h2>Delete account</h2>
        <p className="muted-small settings-note">
          Permanently delete your RepoGuard account and everything stored with
          it.
        </p>

        {!confirming ? (
          <div className="settings-actions">
            <Button variant="danger" onClick={() => setConfirming(true)}>
              <TrashIcon size={16} /> Delete my account
            </Button>
          </div>
        ) : (
          <div className="delete-box">
            <strong>This deletes:</strong>
            <ul>
              <li>
                your {account.repository_count}{" "}
                {account.repository_count === 1 ? "repository" : "repositories"}{" "}
                and {account.audit_count}{" "}
                {account.audit_count === 1 ? "audit" : "audits"}, with every
                finding, accepted risk, AI draft and notification
              </li>
              {account.monitored_count > 0 && (
                <li>
                  the webhooks on your {account.monitored_count} monitored{" "}
                  {account.monitored_count === 1
                    ? "repository"
                    : "repositories"}{" "}
                  (we remove them from GitHub)
                </li>
              )}
              <li>
                your GitHub access token, and RepoGuard's authorization in your
                GitHub account
              </li>
              <li>every login session</li>
            </ul>
            <p className="muted-small">
              This cannot be undone. Your repositories on GitHub are not
              touched.
            </p>

            <label htmlFor="confirm-login">
              Type <code>{account.login}</code> to confirm
            </label>
            <input
              id="confirm-login"
              className="text-input"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />

            <div className="delete-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={deleteAccount}
                loading={deleting}
                disabled={!matches}
              >
                Delete everything
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
