export function finding({
  ruleId,
  category,
  severity,
  title,
  message,
  fix,
  filePath = null,
  key = null,
}) {
  return {
    ruleId,
    category,
    severity,
    title,
    message,
    fix,
    filePath,
    fingerprint: `${ruleId}:${filePath ?? ""}${key ? `:${key}` : ""}`,
  };
}