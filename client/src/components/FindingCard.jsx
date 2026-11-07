import SeverityBadge from "./SeverityBadge";

export default function FindingCard({ finding }) {
  return (
    <details
      className={`finding finding-${finding.severity}`}
      open={finding.severity === "critical"}
    >
      <summary>
        <SeverityBadge severity={finding.severity} />
        <span className="finding-title">{finding.title}</span>
        {finding.change === "new" && <span className="tag-new">NEW</span>}
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
      </div>
    </details>
  );
}