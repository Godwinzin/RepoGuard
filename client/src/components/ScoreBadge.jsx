export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return <span className="score score-none">No score</span>;
  }

  const level = score >= 80 ? "good" : score >= 50 ? "ok" : "bad";
  return <span className={`score score-${level}`}>{score}</span>;
}