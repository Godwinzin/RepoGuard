const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({ score, size = 56 }) {
  const hasScore = score !== null && score !== undefined;
  const level = !hasScore ? "none" : score >= 80 ? "good" : score >= 50 ? "ok" : "bad";
  const filled = hasScore ? (Math.max(0, Math.min(100, score)) / 100) * CIRCUMFERENCE : 0;

  return (
    <div
      className={`ring ring-${level}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={hasScore ? `Score ${score} out of 100` : "No score yet"}
    >
      <svg viewBox="0 0 44 44">
        <circle className="ring-track" cx="22" cy="22" r={RADIUS} />
        {hasScore && (
          <circle
            className="ring-value"
            cx="22"
            cy="22"
            r={RADIUS}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
        )}
      </svg>
      <span className="ring-label" style={{ fontSize: size * 0.3 }}>
        {hasScore ? score : "—"}
      </span>
    </div>
  );
}