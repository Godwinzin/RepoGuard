import { query } from "../db/pool.js";
import { env } from "../config/env.js";
import {
  GitHubError,
  getGitHubToken,
  getRepoSnapshot,
  describeGitHubError,
} from "../services/github.js";
import { buildContext } from "../audit/context.js";
import { scanText } from "../audit/secretScanner.js";
import { generateText } from "./client.js";
import { collectProjectFacts } from "./projectFacts.js";
import { buildPrompt } from "./prompts.js";
import { sanitizeEnvExample } from "./sanitize.js";

const MAX_OUTPUT_CHARS = 20_000;

// Messages that are safe to show the user
class UserFacingError extends Error {}

export async function processRecommendation(recommendationId) {
  const { rows } = await query(
    `SELECT rec.type, rec.status, a.commit_sha,
            r.full_name, r.default_branch, r.user_id
     FROM recommendations rec
     JOIN audits a ON a.id = rec.audit_id
     JOIN repositories r ON r.id = a.repository_id
     WHERE rec.id = $1`,
    [recommendationId],
  );
  const rec = rows[0];

  // Deleted meanwhile, or delivered twice: nothing to do
  if (!rec || !["queued", "running"].includes(rec.status)) return;

  await query("UPDATE recommendations SET status = 'running' WHERE id = $1", [
    recommendationId,
  ]);

  try {
    const token = await getGitHubToken(rec.user_id);
    if (!token) throw new GitHubError(401, "GitHub account not linked");

    // Use the exact commit that was audited
    const snapshot = await getRepoSnapshot(
      token,
      rec.full_name,
      rec.commit_sha ?? rec.default_branch,
    );
    const ctx = buildContext({
      token,
      fullName: rec.full_name,
      defaultBranch: rec.default_branch,
      snapshot,
    });

    const facts = await collectProjectFacts(ctx);

    if (rec.type === "env_example" && facts.envNames.length === 0) {
      throw new UserFacingError(
        "No environment variables were found in this repository",
      );
    }

    const { system, user } = buildPrompt(rec.type, facts);
    console.log(user); // TEMPORARY: remove after testing
    let text = await generateText({ system, user, maxTokens: 1800 });

    if (rec.type === "env_example")
      text = sanitizeEnvExample(text, facts.envNames);
    text = text.trim();

    if (!text) throw new UserFacingError("The AI returned an empty answer");
    if (text.length > MAX_OUTPUT_CHARS)
      throw new UserFacingError("The AI answer was too long");
    if (scanText(text).length > 0) {
      throw new UserFacingError(
        "The AI answer was rejected because it contained something that looks like a secret",
      );
    }

    await query(
      `UPDATE recommendations
       SET status = 'done', content = $1, model = $2, finished_at = now()
       WHERE id = $3`,
      [text, env.aiModel, recommendationId],
    );
  } catch (err) {
    // Log the message only, never prompts or file contents

    let message = "Generation failed";
    if (err instanceof GitHubError) message = describeGitHubError(err).message;
    else if (err instanceof UserFacingError) message = err.message;
    else if (err.status === 429) {
      message =
        "The AI service is busy or its free limit was reached. Try again later.";
    }

    await query(
      `UPDATE recommendations
       SET status = 'failed', error_message = $1, finished_at = now()
       WHERE id = $2`,
      [message, recommendationId],
    );
  }
}
