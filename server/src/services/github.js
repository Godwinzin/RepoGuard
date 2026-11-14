import { query } from "../db/pool.js";
import { decrypt } from "../utils/crypto.js";
import { env } from "../config/env.js";

const REQUEST_TIMEOUT_MS = 15_000;

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Get and decrypt the user's GitHub token
export async function getGitHubToken(userId) {
  const { rows } = await query(
    "SELECT access_token_encrypted FROM github_accounts WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) return null;
  return decrypt(rows[0].access_token_encrypted);
}

// One place that talks to GitHub.
// `signal` lets the caller cancel the request (for example, when an audit times out).
async function githubRequest(token, method, path, body, signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let res;

  try {
    res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoGuard",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // Stop when EITHER the caller cancels OR this one request takes too long
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    // Cancelled by the caller: pass their reason along unchanged
    if (signal?.aborted) throw signal.reason ?? err;
    if (err.name === "TimeoutError") throw new GitHubError(504, "GitHub request timed out");
    throw new GitHubError(502, "Could not reach GitHub");
  }

  if (!res.ok) {
    console.error(`GitHub ${method} ${path} failed with status ${res.status}`);

    const rateLimited =
      (res.status === 403 || res.status === 429) &&
      res.headers.get("x-ratelimit-remaining") === "0";

    throw new GitHubError(
      rateLimited ? 429 : res.status,
      rateLimited ? "GitHub rate limit reached" : `GitHub API error ${res.status}`
    );
  }

  return res.status === 204 ? null : res.json();
}

export const githubFetch = (token, path, signal) =>
  githubRequest(token, "GET", path, undefined, signal);

export const githubSend = (token, method, path, body, signal) =>
  githubRequest(token, method, path, body, signal);

// GitHub returns max 100 items per page, so we loop through pages
export async function listUserRepos(token) {
  const repos = [];

  for (let page = 1; page <= 10; page++) {
    const batch = await githubFetch(
      token,
      `/user/repos?affiliation=owner&visibility=public&sort=updated&per_page=100&page=${page}`
    );
    repos.push(...batch);
    if (batch.length < 100) break; // last page
  }

  return repos;
}

// Get the latest commit and the full list of files on a branch (or a commit SHA)
export async function getRepoSnapshot(token, fullName, branch, signal) {
  const commit = await githubFetch(
    token,
    `/repos/${fullName}/commits/${encodeURIComponent(branch)}`,
    signal
  );
  const tree = await githubFetch(
    token,
    `/repos/${fullName}/git/trees/${commit.commit.tree.sha}?recursive=1`,
    signal
  );

  return {
    commitSha: commit.sha,
    truncated: tree.truncated,
    files: tree.tree
      .filter((item) => item.type === "blob") // files only, not folders
      .map((item) => ({ path: item.path, sha: item.sha, size: item.size })),
  };
}

// Read one file's text by its blob SHA
export async function getBlobText(token, fullName, blobSha, signal) {
  const blob = await githubFetch(token, `/repos/${fullName}/git/blobs/${blobSha}`, signal);
  return Buffer.from(blob.content, blob.encoding).toString("utf8");
}

// Returns true if the webhook is gone, false if we couldn't remove it
export async function deleteWebhook(userId, fullName, hookId) {
  if (!hookId) return true;

  try {
    // GitHub answers 404 (not 403) when a token lacks permission, so check the scope ourselves
    const { rows } = await query("SELECT scopes FROM github_accounts WHERE user_id = $1", [userId]);
    const scopes = (rows[0]?.scopes ?? "").split(/[,\s]+/);
    if (!scopes.includes("admin:repo_hook")) {
      console.error("Cannot delete webhook: the GitHub token lacks admin:repo_hook. Log in again.");
      return false;
    }

    const token = await getGitHubToken(userId);
    if (!token) return false;

    await githubSend(token, "DELETE", `/repos/${fullName}/hooks/${hookId}`);
    return true;
  } catch (err) {
    if (!(err instanceof GitHubError)) throw err;
    if (err.status === 404) return true; // with the scope verified above, this means "already gone"
    console.error(`Could not delete webhook ${hookId}: ${err.message}`);
    return false;
  }
}

// Turns a GitHub failure into something a user can act on
export function describeGitHubError(err) {
  switch (err.status) {
    case 401:
      return {
        code: "github_auth",
        message:
          "Your GitHub connection has expired. Reconnect GitHub, then run the audit again.",
      };
    case 403:
      return { code: "forbidden", message: "GitHub refused access to this repository." };
    case 404:
      return {
        code: "not_found",
        message:
          "We couldn't access this repository. It may have been renamed, made private or deleted.",
      };
    case 409:
      return {
        code: "empty_repo",
        message: "This repository looks empty. Add some code and try again.",
      };
    case 429:
      return {
        code: "rate_limited",
        message: "GitHub is limiting requests right now. Please try again in a few minutes.",
      };
    default:
      return {
        code: "github_error",
        message: "GitHub isn't responding properly right now. Please try again in a few minutes.",
      };
  }
}
// Revoke RepoGuard's authorization in the user's GitHub account. This also invalidates
// every token we hold for them. Returns true if GitHub confirms (or says the token was
// already invalid), false if we could not do it.
export async function revokeGitHubAuthorization(token) {
  const credentials = Buffer.from(
    `${env.github.clientId}:${env.github.clientSecret}`
  ).toString("base64");

  try {
    const res = await fetch(`https://api.github.com/applications/${env.github.clientId}/grant`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoGuard",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // 204 means revoked. An invalid token returns 404, which means there is nothing left to revoke.
    return res.status === 204 || res.status === 404;
  } catch {
    return false; // never log the token or the request
  }
}