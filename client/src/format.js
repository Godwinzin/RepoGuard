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