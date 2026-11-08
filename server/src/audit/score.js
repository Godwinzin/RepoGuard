export const PENALTY = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };

// Accepted findings don't count
export function calculateScore(findings) {
  const penalty = findings
    .filter((f) => !f.accepted)
    .reduce((sum, f) => sum + PENALTY[f.severity], 0);

  return Math.max(0, 100 - penalty);
}