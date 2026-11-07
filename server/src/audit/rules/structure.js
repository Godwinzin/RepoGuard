import { finding } from "../finding.js";
import { basename, isEnvFile } from "../helpers.js";

const EXAMPLE_ENV = /\.(example|sample|template|dist)$/i;


const readmeMissing = {
  id: "readme-missing",
  category: "documentation",
  run(ctx) {
    const hasReadme = ctx.files.some((p) => /^readme(\.(md|markdown|txt|rst))?$/i.test(p));
    if (hasReadme) return [];

    return [
      finding({
        ruleId: "readme-missing",
        category: "documentation",
        severity: "medium",
        title: "No README found",
        message:
          "Without a README, nobody (including you in six months) knows what the project does or how to run it.",
        fix: "Add a README.md in the project root explaining what the project does, how to install it, and how to run it.",
      }),
    ];
  },
};

const gitignoreMissing = {
  id: "gitignore-missing",
  category: "structure",
  run(ctx) {
    if (ctx.hasFile(".gitignore")) return [];

    return [
      finding({
        ruleId: "gitignore-missing",
        category: "structure",
        severity: "medium",
        title: "No .gitignore found",
        message:
          "Without a .gitignore, files like node_modules, build output, and .env files are easy to commit by accident.",
        fix: "Add a .gitignore in the project root that lists node_modules, .env, and build folders such as dist.",
        filePath: ".gitignore",
      }),
    ];
  },
};

const envCommitted = {
  id: "env-committed",
  category: "security",
  run(ctx) {
    return ctx.files
      .filter((p) => isEnvFile(p) && !EXAMPLE_ENV.test(p))
      .map((path) =>
        finding({
          ruleId: "env-committed",
          category: "security",
          severity: "critical",
          title: "Environment file committed to the repository",
          message:
            "Environment files usually contain passwords and API keys. Anyone who can see this repository can read them, and they stay in the Git history even after you delete the file.",
          fix: "Run `git rm --cached <file>`, add it to .gitignore, and rotate every secret that was inside it.",
          filePath: path,
        })
      );
  },
};

const envExampleMissing = {
  id: "env-example-missing",
  category: "structure",
  run(ctx) {
    const hasPackageJson = ctx.files.some((p) => basename(p) === "package.json");
    const hasExample = ctx.files.some(
      (p) => basename(p).startsWith(".env") && EXAMPLE_ENV.test(p)
    );
    if (!hasPackageJson || hasExample) return [];

    return [
      finding({
        ruleId: "env-example-missing",
        category: "structure",
        severity: "low",
        title: "No .env.example file",
        message:
          "If your app uses environment variables, new developers have no way to know which ones they need to set.",
        fix: "Add a .env.example that lists every required variable name with placeholder values (never real secrets).",
        filePath: ".env.example",
      }),
    ];
  },
};

const licenseMissing = {
  id: "license-missing",
  category: "documentation",
  run(ctx) {
    const hasLicense = ctx.files.some((p) =>
      /^(license|licence|copying)(\.(md|txt))?$/i.test(p)
    );
    if (hasLicense) return [];

    return [
      finding({
        ruleId: "license-missing",
        category: "documentation",
        severity: "low",
        title: "No license file",
        message:
          "Without a license, the default is 'all rights reserved'. Others have no legal permission to reuse or modify your code, even if the repository is public.",
        fix: "Add a LICENSE file. MIT is a common permissive choice, and choosealicense.com helps you pick.",
        filePath: "LICENSE",
      }),
    ];
  },
};

export const structureRules = [
  readmeMissing,
  gitignoreMissing,
  envCommitted,
  envExampleMissing,
  licenseMissing,
];
