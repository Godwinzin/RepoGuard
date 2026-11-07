import { isEnvFile, isValidPackageName, findPackageJsons, mapLimit } from "../audit/helpers.js";
import { scanText } from "../audit/secretScanner.js";

const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,79}$/;
const FILE_OR_FOLDER = /^[A-Za-z0-9._-]{1,50}$/;
const SCRIPT_NAME = /^[\w:.-]{1,40}$/;
const SOURCE_FILE = /\.(js|jsx|ts|tsx|mjs|cjs)$/i;
const SKIP_PATH = /(^|\/)(node_modules|dist|build|vendor|coverage|\.git)(\/|$)/;

const MAX_SOURCE_FILES = 120;
const MAX_SOURCE_BYTES = 100_000;

// Variables bundlers define for every project, which aren't worth documenting
const IGNORED_NAMES = new Set(["NODE_ENV", "MODE", "DEV", "PROD", "SSR", "BASE_URL"]);

const ENV_USAGE = [
  /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /process\.env\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/g,
  /import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
];

// Variable NAMES used in code. Only the names are returned, never any surrounding code.
export function extractEnvNames(code) {
  const names = new Set();
  for (const pattern of ENV_USAGE) {
    for (const match of code.matchAll(pattern)) {
      if (NAME.test(match[1]) && !IGNORED_NAMES.has(match[1])) names.add(match[1]);
    }
  }
  return names;
}

// KEYS from an env file. The value is never captured.
export function extractEnvKeys(text) {
  const keys = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match && NAME.test(match[1])) keys.add(match[1]);
  }
  return keys;
}

// "API_KEY=abc node app.js" -> "API_KEY=<value removed> node app.js"
export function redactCommand(command) {
  return command.replace(/\b([A-Za-z_][A-Za-z0-9_]*)=(\S+)/g, "$1=<value removed>");
}

// Free text from the repo: shorten it, and drop it entirely if it looks like a secret
function redact(value, max) {
  if (typeof value !== "string") return null;
  const text = value.slice(0, max);
  return scanText(text).length > 0 ? "[removed: possible secret]" : text;
}

const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const depth = (path) => path.split("/").length;

export async function collectProjectFacts(ctx) {
  // In a monorepo, describe the shallowest package.json
  const pkgPath = findPackageJsons(ctx).sort((a, b) => depth(a) - depth(b))[0];
  const pkg = asObject(pkgPath ? await ctx.readJson(pkgPath) : null);

  const envNames = new Set();

  // 1. Names from env files (keys only)
  const envFiles = ctx.files.filter((p) => isEnvFile(p) && !SKIP_PATH.test(p)).slice(0, 10);
  for (const path of envFiles) {
    const text = await ctx.readFile(path, MAX_SOURCE_BYTES);
    if (text) extractEnvKeys(text).forEach((k) => envNames.add(k));
  }

  // 2. Names used in source files (names only)
  const sources = ctx.files
    .filter((p) => SOURCE_FILE.test(p) && !SKIP_PATH.test(p))
    .filter((p) => ctx.sizeOf(p) > 0 && ctx.sizeOf(p) <= MAX_SOURCE_BYTES)
    .sort((a, b) => depth(a) - depth(b) || ctx.sizeOf(a) - ctx.sizeOf(b))
    .slice(0, MAX_SOURCE_FILES);

  const found = await mapLimit(sources, 8, async (path) => {
    try {
      const text = await ctx.readFile(path, MAX_SOURCE_BYTES);
      return text ? [...extractEnvNames(text)] : [];
    } catch {
      return [];
    }
  });
  found.flat().forEach((n) => envNames.add(n));

  const scripts = {};
  for (const [name, command] of Object.entries(asObject(pkg.scripts)).slice(0, 20)) {
    if (SCRIPT_NAME.test(name) && typeof command === "string") {
      scripts[name] = redact(redactCommand(command), 200);
    }
  }

  const dependencies = Object.keys(asObject(pkg.dependencies))
    .filter(isValidPackageName)
    .slice(0, 40);

  const topLevel = (list) =>
    [...new Set(list)]
      .filter((n) => FILE_OR_FOLDER.test(n) && n !== "node_modules" && n !== ".git")
      .sort()
      .slice(0, 30);

  return {
    projectName: redact(pkg.name, 80),
    description: redact(pkg.description, 300),
    scripts,
    dependencies,
    envNames: [...envNames].sort().slice(0, 100),
    topLevelFolders: topLevel(ctx.files.filter((p) => p.includes("/")).map((p) => p.split("/")[0])),
    rootFiles: topLevel(ctx.files.filter((p) => !p.includes("/"))),
  };
}