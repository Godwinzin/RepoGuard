import { finding } from "../finding.js";
import {
  MAX_LOCKFILE_BYTES,
  SEVERITY_RANK,
  dirname,
  findPackageJsons,
  join,
  mapLimit,
} from "../helpers.js";
import {
  findVulnerableIds,
  getVulnDetails,
  summarizeVuln,
} from "../../services/osv.js";
import { getLatestVersion } from "../../services/npm.js";

const MAX_VULNERABLE_PACKAGES = 40;
const MAX_DIRECT_DEPENDENCIES = 60;

// Only npm lockfiles with the "packages" section (npm 7+) are supported for now
async function loadLock(ctx, pkgPath) {
  const lockPath = join(dirname(pkgPath), "package-lock.json");
  if (!ctx.hasFile(lockPath)) return null;

  const lock = await ctx.readJson(lockPath, MAX_LOCKFILE_BYTES);
  return lock?.packages ? { lockPath, packages: lock.packages } : null;
}

// Every installed package (including nested ones), once per name@version
function extractDependencies(packages) {
  const seen = new Set();
  const deps = [];

  for (const [key, info] of Object.entries(packages)) {
    if (!key.includes("node_modules/") || info.link || !info.version) continue;

    const name =
      info.name ??
      key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
    const id = `${name}@${info.version}`;
    if (seen.has(id)) continue;

    seen.add(id);
    deps.push({ name, version: info.version });
  }

  return deps;
}

const vulnerableDependencies = {
  id: "vulnerable-dependencies",
  category: "security",
  async run(ctx) {
    const findings = [];

    for (const pkgPath of findPackageJsons(ctx)) {
      const lock = await loadLock(ctx, pkgPath);

      if (!lock) {
        const dir = dirname(pkgPath);
        const unsupported = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]
          .map((name) => join(dir, name))
          .find((p) => ctx.hasFile(p));

        if (unsupported) {
          findings.push(
            finding({
              ruleId: "dependency-scan-skipped",
              category: "dependencies",
              severity: "info",
              title: "Vulnerability scan skipped for this lockfile",
              message:
                "RepoGuard currently scans npm lockfiles (npm 7 or newer) under 10 MB. This one wasn't scanned.",
              fix: "No action needed. Support for more lockfile types is planned.",
              filePath: unsupported,
            }),
          );
        }
        continue;
      }

      try {
        const deps = extractDependencies(lock.packages);
        const vulnerable = await findVulnerableIds(deps, ctx.signal);
        const shown = vulnerable.slice(0, MAX_VULNERABLE_PACKAGES);

        const detailed = await mapLimit(shown, 5, async (pkg) => {
          const vulns = await mapLimit(pkg.ids, 3, (id) => getVulnDetails(id), ctx.signal);
          const advisories = vulns
            .map((v) => summarizeVuln(v, pkg.name))
            .sort(
              (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
            );
          return { ...pkg, advisories };
        }, ctx.signal);

        for (const pkg of detailed) {
          const worst = pkg.advisories[0];
          const listed = pkg.advisories
            .slice(0, 3)
            .map((a) => `${a.id}: ${a.summary}`)
            .join("; ");
          const more =
            pkg.advisories.length > 3
              ? ` (+${pkg.advisories.length - 3} more)`
              : "";
          const fixed = [
            ...new Set(pkg.advisories.flatMap((a) => a.fixedVersions)),
          ].slice(0, 3);

          findings.push(
            finding({
              ruleId: "vulnerable-dependency",
              category: "security",
              severity: worst.severity,
              title: `Vulnerable dependency: ${pkg.name}@${pkg.version}`,
              message: `Known vulnerabilities let attackers exploit your app through this package, even if your own code is safe. Advisories: ${listed}${more}.`,
              fix: fixed.length
                ? `Upgrade ${pkg.name} to a patched version (${fixed.join(", ")}) and re-run your tests. Try \`npm audit fix\` first.`
                : `No patched version is listed. Read the advisory, or consider replacing ${pkg.name}.`,
              filePath: lock.lockPath,
              key: `${pkg.name}@${pkg.version}`,
            }),
          );
        }

        if (vulnerable.length > shown.length) {
          findings.push(
            finding({
              ruleId: "vulnerable-dependencies-truncated",
              category: "security",
              severity: "info",
              title: `${vulnerable.length - shown.length} more vulnerable packages not listed`,
              message:
                "The report shows the first batch of vulnerable packages only.",
              fix: "Run `npm audit` locally for the complete list.",
              filePath: lock.lockPath,
            }),
          );
        }
      } catch (err) {
        // Be honest: "scan failed" must never look like "no vulnerabilities"
        console.error("Vulnerability scan failed:", err.message);
        findings.push(
          finding({
            ruleId: "vulnerability-scan-failed",
            category: "security",
            severity: "info",
            title: "Vulnerability scan could not be completed",
            message:
              "The vulnerability database couldn't be reached, so this lockfile was not checked.",
            fix: "Run the audit again in a few minutes.",
            filePath: lock.lockPath,
          }),
        );
      }
    }

    return findings;
  },
};

const majorOf = (version) => Number(String(version).split(".")[0]);

const outdatedDependencies = {
  id: "outdated-dependencies",
  category: "dependencies",
  async run(ctx) {
    const findings = [];

    for (const pkgPath of findPackageJsons(ctx)) {
      const pkg = await ctx.readJson(pkgPath);
      const lock = await loadLock(ctx, pkgPath);
      if (!pkg || !lock) continue;

      const names = Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }).slice(0, MAX_DIRECT_DEPENDENCIES);

      const checks = await mapLimit(names, 8, async (name) => {
        const installed = lock.packages[`node_modules/${name}`]?.version;
        if (!installed) return null;

        const latest = await getLatestVersion(name, ctx.signal);
        if (!latest) return null;

        return majorOf(latest) > majorOf(installed)
          ? { name, installed, latest }
          : null;
      }, ctx.signal);

      const outdated = checks.filter(Boolean);
      if (outdated.length === 0) continue;

      const listed = outdated
        .slice(0, 15)
        .map((d) => `${d.name} ${d.installed} → ${d.latest}`)
        .join(", ");
      const more =
        outdated.length > 15 ? ` (+${outdated.length - 15} more)` : "";

      findings.push(
        finding({
          ruleId: "dependencies-outdated",
          category: "dependencies",
          severity: "low",
          title: `${outdated.length} dependencies are a major version behind`,
          message: `Falling far behind makes upgrades harder and means missing security fixes and features. Behind: ${listed}${more}.`,
          fix: "Upgrade one package at a time, read its changelog for breaking changes, and run your tests after each. `npx npm-check-updates` shows what's available.",
          filePath: pkgPath,
        }),
      );
    }

    return findings;
  },
};

export const dependencyRules = [vulnerableDependencies, outdatedDependencies];
