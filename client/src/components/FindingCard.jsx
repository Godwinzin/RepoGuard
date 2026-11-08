import { useId, useState } from "react";
import Button from "./Button";
import SeverityBadge from "./SeverityBadge";

const MIN_REASON = 8;

export default function FindingCard({ finding, canManage = false, onAccept, onRestore }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const fieldId = useId();

  const needsReason = finding.severity === "critical" || finding.severity === "high";
  const tooShort = needsReason && reason.trim().length < MIN_REASON;

  async function submit() {
    setBusy(true);
    const ok = await onAccept(finding, reason.trim());
    setBusy(false);
    if (ok) {
      setAsking(false);
      setReason("");
    }
  }

  async function restore() {
    setBusy(true);
    await onRestore(finding);
    setBusy(false);
  }

  return (
    <details
      className={`finding finding-${finding.severity} ${finding.accepted ? "finding-accepted" : ""}`}
      open={finding.severity === "critical" && !finding.accepted}
    >
      <summary>
        <SeverityBadge severity={finding.severity} />
        <span className="finding-title">{finding.title}</span>
        {finding.change === "new" && !finding.accepted && <span className="tag-new">NEW</span>}
      </summary>

      <div className="finding-body">
        {finding.file_path && (
          <p className="muted-small">
            File: <code>{finding.file_path}</code>
          </p>
        )}

        <h4>Why it matters</h4>
        <p>{finding.message}</p>

        <h4>How to fix it</h4>
        <p>{finding.fix}</p>

        {finding.accepted ? (
          <div className="accepted-note">
            <div>
              <strong>Accepted risk</strong>
              {/* The reason is typed by a person, so it is shown as plain text */}
              <p>{finding.accepted_reason || "No reason given."}</p>
            </div>
            {canManage && (
              <Button variant="secondary" size="sm" onClick={restore} loading={busy}>
                Restore
              </Button>
            )}
          </div>
        ) : (
          canManage &&
          (asking ? (
            <div className="accept-form">
              <label htmlFor={fieldId}>
                Why is this acceptable? {needsReason ? "(required)" : "(optional)"}
              </label>
              <textarea
                id={fieldId}
                className="textarea"
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example: this is a made-up value in a test file."
              />
              <div className="accept-actions">
                <span className="muted-small">{reason.length}/300</span>
                <Button variant="ghost" size="sm" onClick={() => setAsking(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submit} loading={busy} disabled={tooShort}>
                  Accept risk
                </Button>
              </div>
            </div>
          ) : (
            <div className="finding-actions">
              <Button variant="secondary" size="sm" onClick={() => setAsking(true)}>
                Accept this risk
              </Button>
            </div>
          ))
        )}
      </div>
    </details>
  );
}