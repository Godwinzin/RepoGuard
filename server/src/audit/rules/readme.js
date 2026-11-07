import { finding } from "../finding.js";
import { basename, isEnvFile } from "../helpers.js";

const README_PATH = /^readme(\.(md|markdown|txt|rst))?$/i;

const TOPICS = [
  {
    ruleId: "readme-no-install",
    pattern: /install|getting started|setup|set up|npm i\b|yarn|pnpm/i,
    title: "README doesn't explain how to install the project",
    message: "New contributors (and future you) can't get the project running without guessing.",
    fix: "Add an Installation section with the exact commands, e.g. `git clone ...` then `npm install`.",
  },
  {
    ruleId: "readme-no-run",
    pattern: /npm (run )?(start|dev)|yarn (start|dev)|pnpm (start|dev)|usage|how to run|running the|run the/i,
    title: "README doesn't explain how to run the application",
    message: "Even after installing, people need to know which command starts the app.",
    fix: "Add a Usage or Running section, e.g. `npm run dev` and the URL to open.",
  },
  {
    ruleId: "readme-no-env",
    pattern: /\.env|environment variable|env var/i,
    onlyIf: (ctx) => ctx.files.some((p) => isEnvFile(p)),
    title: "README doesn't document environment variables",
    message: "The project uses environment files, but nothing explains which variables are required.",
    fix: "Add a Configuration section listing each variable, what it does, and an example value.",
  },
];

const readmeQuality = {
  id: "readme-quality",
  category: "documentation",
  async run(ctx) {
    const path = ctx.files.find((p) => README_PATH.test(p));
    if (!path) return []; // the "readme-missing" rule already reports this

    const text = await ctx.readFile(path);
    if (text === null) return [];

    const findings = [];

    if (text.trim().length < 200) {
      findings.push(
        finding({
          ruleId: "readme-too-short",
          category: "documentation",
          severity: "low",
          title: "README is very short",
          message: "A README this short can't explain what the project does or why it exists.",
          fix: "Describe what the project does, who it's for, and what makes it useful, in a few paragraphs.",
          filePath: path,
        })
      );
    }

    for (const topic of TOPICS) {
      if (topic.onlyIf && !topic.onlyIf(ctx)) continue;
      if (topic.pattern.test(text)) continue;

      findings.push(
        finding({
          ruleId: topic.ruleId,
          category: "documentation",
          severity: "low",
          title: topic.title,
          message: topic.message,
          fix: topic.fix,
          filePath: path,
        })
      );
    }

    return findings;
  },
};

export const readmeRules = [readmeQuality];