import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "up" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "down" });
  }
});

export default router;