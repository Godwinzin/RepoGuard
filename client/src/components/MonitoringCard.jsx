import { useState } from "react";
import { api } from "../api";
import { useToast } from "../toast/useToast";

export default function MonitoringCard({ repoId, branch, initialEnabled, onChanged }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const toast = useToast();

  async function toggle() {
    setBusy(true);
    setNeedsReconnect(false);

    try {
      if (enabled) {
        const result = await api(`/repos/${repoId}/monitoring`, { method: "DELETE" });
        setEnabled(false);

        if (result.webhookRemoved) {
          toast.success("Monitoring turned off.");
        } else {
          toast.info(
            "Monitoring is off, but we couldn't remove the webhook from GitHub. You can delete it in the repository's Settings → Webhooks."
          );
        }
      } else {
        await api(`/repos/${repoId}/monitoring`, { method: "POST" });
        setEnabled(true);
        toast.success("Monitoring is on. A first audit is running now.");
      }

      onChanged?.();
    } catch (err) {
      if (err.code === "reauthorize_required") setNeedsReconnect(true);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel monitor">
      <div className="monitor-head">
        <h2>Monitoring</h2>

        <div className="monitor-control">
          <span className={`monitor-status ${enabled ? "monitor-status-on" : ""}`}>
            {busy ? (enabled ? "Turning off…" : "Turning on…") : enabled ? "On" : "Off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Automatic monitoring"
            className={`switch ${enabled ? "switch-on" : ""}`}
            onClick={toggle}
            disabled={busy}
          >
            <span className="switch-thumb" />
          </button>
        </div>
      </div>

      <p className="muted-small monitor-desc">
        Audit every push to <code>{branch}</code> and get notified when new problems appear.
      </p>

      {needsReconnect && (
        <div className="callout callout-warn monitor-reconnect">
          <div>
            <strong>One more permission is needed</strong>
            <p>
              To watch your pushes, RepoGuard needs permission to manage this repository's
              webhooks. Reconnect GitHub, approve it, then try again.
            </p>
            <div className="callout-actions">
              <a className="btn btn-primary btn-sm" href="/api/auth/github">
                Reconnect GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}