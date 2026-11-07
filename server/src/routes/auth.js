import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { pool, query } from "../db/pool.js";
import { encrypt } from "../utils/crypto.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { authLimiter } from "../middleware/rateLimits.js";

const router = Router();

// Step 1: send the user to GitHub
router.get("/github", authLimiter, (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: env.github.callbackUrl,
    scope: "read:user user:email admin:repo_hook",
    state,
  });

  req.session.save(() => {
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });
});

// Step 2: GitHub sends the user back here
router.get("/github/callback", authLimiter, async (req, res, next) => {
  const failTo = (reason) =>
    res.redirect(`${env.clientUrl}/login?error=${reason}`);

  try {
    const { code, state, error: oauthError } = req.query;
    const expectedState = req.session.oauthState;

    // The user clicked "Cancel" on GitHub's page
    if (oauthError === "access_denied") return failTo("access_denied");

    if (
      typeof code !== "string" ||
      typeof state !== "string" ||
      !expectedState ||
      state !== expectedState
    ) {
      return failTo("session");
    }

    // Exchange the code for an access token
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.github.clientId,
          client_secret: env.github.clientSecret,
          code,
          redirect_uri: env.github.callbackUrl,
        }),
      },
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return failTo("failed");

    // Fetch the GitHub profile
    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoGuard",
      },
    });
    if (!profileRes.ok) return failTo("failed");
    const profile = await profileRes.json();

    const encryptedToken = encrypt(tokenData.access_token);
    const userId = await saveUser(profile, encryptedToken, tokenData.scope);

    // New session ID after login (prevents session fixation)
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate failed:", err.message);
        return failTo("failed");
      }

      req.session.userId = userId;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save failed:", saveErr.message);
          return failTo("failed");
        }
        return res.redirect(env.clientUrl);
      });
    });
  } catch (err) {
    // Log the message only, never tokens or the request itself
    console.error("GitHub login failed:", err.message);
    return failTo("failed");
  }
});

// Who am I?
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.avatar_url, g.login
       FROM users u
       JOIN github_accounts g ON g.user_id = u.id
       WHERE u.id = $1`,
      [req.session.userId],
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Not authenticated" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Logout
router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("repoguard.sid");
    res.json({ ok: true });
  });
});

// Insert or update the user + GitHub account in one transaction
async function saveUser(profile, encryptedToken, scopes) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT user_id FROM github_accounts WHERE github_id = $1",
      [profile.id],
    );

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].user_id;
      await client.query(
        `UPDATE github_accounts
         SET login = $1, access_token_encrypted = $2, scopes = $3, updated_at = now()
         WHERE github_id = $4`,
        [profile.login, encryptedToken, scopes, profile.id],
      );
      await client.query(
        "UPDATE users SET name = $1, avatar_url = $2, email = $3 WHERE id = $4",
        [
          profile.name || profile.login,
          profile.avatar_url,
          profile.email,
          userId,
        ],
      );
    } else {
      const userRes = await client.query(
        "INSERT INTO users (email, name, avatar_url) VALUES ($1, $2, $3) RETURNING id",
        [profile.email, profile.name || profile.login, profile.avatar_url],
      );
      userId = userRes.rows[0].id;
      await client.query(
        `INSERT INTO github_accounts (user_id, github_id, login, access_token_encrypted, scopes)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, profile.id, profile.login, encryptedToken, scopes],
      );
    }

    await client.query("COMMIT");
    return userId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export default router;
