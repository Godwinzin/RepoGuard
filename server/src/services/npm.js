import { isValidPackageName } from "../audit/helpers.js";

export async function getLatestVersion(name, signal) {
  // package.json comes from someone else's repo, so never trust names blindly
  if (!isValidPackageName(name)) return null;

  const timeout = AbortSignal.timeout(10_000);

  try {
    const res = await fetch(
      `https://registry.npmjs.org/${name.replace("/", "%2f")}/latest`,
      {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch (err) {
    if (signal?.aborted) throw signal.reason ?? err; // a cancelled audit must stop, not shrug
    return null; // a single slow package shouldn't fail the whole audit
  }
}