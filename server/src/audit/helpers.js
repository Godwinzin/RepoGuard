export const basename = (path) => path.split("/").pop();

export const dirname = (path) =>
  path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

export const join = (dir, name) => (dir ? `${dir}/${name}` : name);

export const isEnvFile = (path) => /^\.env(\..+)?$/.test(basename(path));

// Never inspect more than this many package.json files (monorepo safety limit)
export const MAX_PACKAGES = 10;

export function findPackageJsons(ctx) {
  return ctx.files
    .filter((p) => basename(p) === "package.json" && !p.includes("node_modules/"))
    .slice(0, MAX_PACKAGES);
}

export const MAX_LOCKFILE_BYTES = 10_000_000;

export const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

// npm package names: lowercase, optional @scope/, limited characters
export function isValidPackageName(name) {
  return (
    typeof name === "string" &&
    name.length <= 214 &&
    /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
  );
}

/// Run fn over items with at most `limit` running at the same time.
// If `signal` is cancelled, no new items are started.
export async function mapLimit(items, limit, fn, signal) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      signal?.throwIfAborted();
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}