import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /notifications
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, repository_id, audit_id, title, body, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.session.userId]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

// DELETE /notifications: delete all of this user's notifications
router.delete("/", async (req, res, next) => {
  try {
    await query("DELETE FROM notifications WHERE user_id = $1", [req.session.userId]);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/read-all
router.post("/read-all", async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
      [req.session.userId]
    );
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/:id/read
router.post("/:id/read", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const { rowCount } = await query(
      "UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2",
      [id, req.session.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Notification not found" });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /notifications/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    // "AND user_id" keeps users from deleting each other's notifications.
    // Deleting something that's already gone still succeeds: the end result is what the
    // caller wanted, and retrying a delete is then always safe (it's "idempotent").
    await query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [
      id,
      req.session.userId,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;