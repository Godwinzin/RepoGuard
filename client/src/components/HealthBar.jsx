export default function HealthBar({ score }) {
  if (score === null || score === undefined) return <span className="muted-small">—</span>;

  const level = score >= 80 ? "good" : score >= 50 ? "ok" : "bad";

  return (
    <div className="health">
      <span className="health-value">
        {score}
        <small>/100</small>
      </span>
      <span className="health-track" role="img" aria-label={`Score ${score} out of 100`}>
        <span className={`health-fill health-${level}`} style={{ width: `${score}%` }} />
      </span>
    </div>
  );
}