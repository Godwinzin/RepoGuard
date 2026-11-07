export default function SeverityBadge({ severity }) {
  return <span className={`sev sev-${severity}`}>{severity}</span>;
}