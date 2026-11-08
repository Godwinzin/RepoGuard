const MAX_LENGTH = 300;
const MIN_REQUIRED_LENGTH = 8;

// Critical and high problems need a real reason. Everything else may skip it.
export function validateReason(severity, rawReason) {
  const required = severity === "critical" || severity === "high";
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";

  if (reason.length > MAX_LENGTH) {
    return { ok: false, message: `Please keep the reason under ${MAX_LENGTH} characters.` };
  }

  if (required && reason.length < MIN_REQUIRED_LENGTH) {
    return {
      ok: false,
      message:
        "Critical and high problems need a reason of at least 8 characters, so the decision still makes sense later.",
    };
  }

  return { ok: true, reason: reason || null };
}