const OSV = "https://api.osv.dev/v1";
const BATCH_SIZE = 1000;

// Vulnerability details rarely change, so cache them in memory.
const detailCache = new Map();

async function osvFetch(url, options = {}, signal) {
  const timeout = AbortSignal.timeout(15_000);
  const res = await fetch(url, {
    ...options,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`OSV request failed (${res.status})`);
  return res.json();
}

// deps: [{ name, version }]  ->  [{ name, version, ids: [...] }] (only vulnerable ones)
export async function findVulnerableIds(deps, signal) {
  const vulnerable = [];

  for (let i = 0; i < deps.length; i += BATCH_SIZE) {
    const chunk = deps.slice(i, i + BATCH_SIZE);

    const data = await osvFetch(
      `${OSV}/querybatch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: chunk.map((d) => ({
            package: { name: d.name, ecosystem: "npm" },
            version: d.version,
          })),
        }),
      },
      signal
    );

    data.results.forEach((result, index) => {
      const ids = (result.vulns ?? []).map((v) => v.id);
      if (ids.length > 0) {
        vulnerable.push({ name: chunk[index].name, version: chunk[index].version, ids });
      }
    });
  }

  return vulnerable;
}

export function getVulnDetails(id) {
  if (!detailCache.has(id)) {
    const promise = osvFetch(`${OSV}/vulns/${encodeURIComponent(id)}`).catch((err) => {
      detailCache.delete(id); // don't cache failures
      throw err;
    });
    detailCache.set(id, promise);
  }
  return detailCache.get(id);
}

const SEVERITY_MAP = {
  CRITICAL: "critical",
  HIGH: "high",
  MODERATE: "medium",
  MEDIUM: "medium",
  LOW: "low",
};

// Boil a big OSV record down to what we need
export function summarizeVuln(vuln, packageName) {
  const severity =
    SEVERITY_MAP[String(vuln.database_specific?.severity).toUpperCase()] ?? "medium";

  const fixed = new Set();
  for (const affected of vuln.affected ?? []) {
    if (affected.package?.name !== packageName) continue;
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) fixed.add(event.fixed);
      }
    }
  }

  return {
    id: vuln.id,
    summary: vuln.summary ?? "No summary available",
    severity,
    fixedVersions: [...fixed],
  };
}