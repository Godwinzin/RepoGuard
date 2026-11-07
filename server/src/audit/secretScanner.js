// Shannon entropy: how random a string looks. Real keys score high (4+),
// plain words and repeated characters score low.
export function shannonEntropy(text) {
  const counts = new Map();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);

  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / text.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const PLACEHOLDER =
  /example|placeholder|your[_-]|changeme|change[_-]me|dummy|sample|xxxx|\*{4,}|<[^>]+>|\$\{|\{\{/i;

const GENERIC_ASSIGNMENT =
  /(?:api[_-]?key|secret|token|passw(?:or)?d|credential)[\w.-]*\s*[:=]\s*["']([^"'\s]{16,})["']/i;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];

// Most specific patterns first. Only the first match per line is reported.
// None of these regexes use the /g flag, so they carry no hidden state between calls.
const PATTERNS = [
  { type: "AWS access key ID", severity: "critical", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  {
    type: "GitHub token",
    severity: "critical",
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/,
  },
  { type: "Stripe live secret key", severity: "critical", regex: /\b[rs]k_live_[0-9a-zA-Z]{24,}\b/ },
  { type: "Slack token", severity: "critical", regex: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
  { type: "Google API key", severity: "high", regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    type: "AI provider API key",
    severity: "critical",
    regex: /\bsk-(?:ant-|proj-)[A-Za-z0-9_-]{20,}/,
  },
  {
    type: "private key",
    severity: "critical",
    regex: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY(?: BLOCK)?-----/,
  },
  {
    type: "password in a connection string",
    severity: "high",
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s:@/]+:([^\s@/]+)@([^\s:/?#]+)/i,
    group: 1,
    skip: (match, password) =>
      LOCAL_HOSTS.includes(match[2].toLowerCase()) ||
      password.length < 6 ||
      /^(password|pass|secret|postgres|root|admin|changeme|\*+)$/i.test(password),
  },
  {
    type: "hardcoded secret-like value",
    severity: "medium",
    regex: GENERIC_ASSIGNMENT,
    group: 1,
    skip: (match, value) => shannonEntropy(value) < 3.5,
  },
];

// Returns [{ type, severity, line, value }].
// `value` exists only in memory so the caller can fingerprint it. It must never be stored or logged.
export function scanText(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    // Skip minified or absurdly long lines. This also protects against slow regex matching.
    if (line.length > 1000) return;

    for (const pattern of PATTERNS) {
      const match = pattern.regex.exec(line);
      if (!match) continue;

      const value = match[pattern.group ?? 0];
      if (!value || PLACEHOLDER.test(value)) continue;
      if (pattern.skip?.(match, value)) continue;

      hits.push({ type: pattern.type, severity: pattern.severity, line: index + 1, value });
      break;
    }
  });

  return hits;
}