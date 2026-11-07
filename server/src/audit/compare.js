// Compare two lists of findings by fingerprint
export function compareFindings(previous, current) {
  const previousFingerprints = new Set(previous.map((f) => f.fingerprint));
  const currentFingerprints = new Set(current.map((f) => f.fingerprint));

  const added = [];
  const unchanged = [];

  for (const finding of current) {
    if (previousFingerprints.has(finding.fingerprint)) unchanged.push(finding);
    else added.push(finding);
  }

  // In the old audit but not the new one: fixed
  const fixed = previous.filter((f) => !currentFingerprints.has(f.fingerprint));

  return { added, unchanged, fixed };
}