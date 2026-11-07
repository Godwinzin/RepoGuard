// Keep comments and ONLY the variables we know exist. Everything else is dropped.
export function sanitizeEnvExample(text, names) {
  const allowed = new Set(names);
  const seen = new Set();
  const lines = [];

  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);

    if (match) {
      if (!allowed.has(match[1]) || seen.has(match[1])) continue; // invented or duplicate
      seen.add(match[1]);
      lines.push(line);
    } else if (line.trim() === "" || line.trim().startsWith("#")) {
      lines.push(line);
    }
    // anything else (prose, code fences) is dropped
  }

  // Make sure no real variable was forgotten
  for (const name of names) {
    if (!seen.has(name)) lines.push(`${name}=`);
  }

  return lines.join("\n").trim() + "\n";
}