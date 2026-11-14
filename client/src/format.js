export function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-GB") : "—";
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

// "3 hours ago", "yesterday", "just now"
export function timeAgo(value) {
  if (!value) return "Never";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

// "owner/repo" -> { owner, name }
export function splitName(fullName) {
  const [owner, name] = fullName.split("/");
  return { owner, name };
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

// One label per repository, used by the table, chips and filters
export function statusOf(repo) {
  const score = repo.latest_score;
  if (score === null || score === undefined) return { key: "none", label: "Not audited" };
  if (score < 50) return { key: "risk", label: "At risk" };
  if (repo.critical_count > 0 || score < 80) return { key: "attention", label: "Needs attention" };
  return { key: "healthy", label: "Healthy" };
}