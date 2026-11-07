import { finding } from "../finding.js";
import { dirname, join, findPackageJsons } from "../helpers.js";

const LOCKFILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock"];
const TEST_FILE = /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;
const CI_FILE = /^(\.github\/workflows\/.+\.ya?ml|\.circleci\/config\.yml|\.travis\.yml|Jenkinsfile)$/;

const nodeModulesCommitted = {
  id: "node-modules-committed",
  category: "structure",
  run(ctx) {
    if (!ctx.files.some((p) => p.startsWith("node_modules/") || p.includes("/node_modules/"))) {
      return [];
    }
    return [
      finding({
        ruleId: "node-modules-committed",
        category: "structure",
        severity: "high",
        title: "node_modules is committed to the repository",
        message:
          "node_modules is huge, slows every clone, and can contain platform-specific files. It should be rebuilt from package.json instead of stored in Git.",
        fix: "Run `git rm -r --cached node_modules`, add node_modules to .gitignore, and commit.",
        filePath: "node_modules",
      }),
    ];
  },
};

const lockfileMissing = {
  id: "lockfile-missing",
  category: "dependencies",
  run(ctx) {
    const findings = [];

    for (const pkgPath of findPackageJsons(ctx)) {
      const dir = dirname(pkgPath);
      const hasLock = LOCKFILES.some((name) => ctx.hasFile(join(dir, name)));
      if (hasLock) continue;

      findings.push(
        finding({
          ruleId: "lockfile-missing",
          category: "dependencies",
          severity: "medium",
          title: "No lockfile next to package.json",
          message:
            "Without a lockfile, every install can pull different dependency versions. Builds aren't reproducible, and vulnerability checks can't know your exact versions.",
          fix: "Run `npm install` (or yarn/pnpm) in this folder and commit the generated lockfile.",
          filePath: pkgPath,
        })
      );
    }

    return findings;
  },
};

const testsMissing = {
  id: "tests-missing",
  category: "quality",
  async run(ctx) {
    const packageJsons = findPackageJsons(ctx);
    if (packageJsons.length === 0) return []; // not a JavaScript project

    if (ctx.files.some((p) => TEST_FILE.test(p))) return [];

    for (const pkgPath of packageJsons) {
      const pkg = await ctx.readJson(pkgPath);
      const script = pkg?.scripts?.test;
      // npm's default placeholder doesn't count as a real test script
      if (script && !/no test specified/i.test(script)) return [];
    }

    return [
      finding({
        ruleId: "tests-missing",
        category: "quality",
        severity: "medium",
        title: "No automated tests found",
        message:
          "Without tests, every change risks silently breaking something, and nobody can safely refactor or upgrade dependencies.",
        fix: "Add a test runner (Vitest for Vite/React projects, Jest or node:test for Node), write a first test, and add a `test` script to package.json.",
      }),
    ];
  },
};

const ciMissing = {
  id: "ci-missing",
  category: "quality",
  run(ctx) {
    if (findPackageJsons(ctx).length === 0) return [];
    if (ctx.files.some((p) => CI_FILE.test(p))) return [];

    return [
      finding({
        ruleId: "ci-missing",
        category: "quality",
        severity: "low",
        title: "No CI configuration found",
        message:
          "Continuous integration runs your tests and build on every push, catching broken code before it reaches your main branch.",
        fix: "Add a GitHub Actions workflow in .github/workflows/ that installs dependencies, runs the build, and runs the tests.",
        filePath: ".github/workflows",
      }),
    ];
  },
};

export const projectRules = [nodeModulesCommitted, lockfileMissing, testsMissing, ciMissing];