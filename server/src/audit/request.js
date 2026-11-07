import { query } from "../db/pool.js";
import { createAudit } from "./runAudit.js";
import { enqueueAudit } from "../jobs/queue.js";

export async function requestAudit(repositoryId, triggeredBy = "manual") {
  const audit = await createAudit(repositoryId, triggeredBy);

  if (!audit.existing) {
    try {
      await enqueueAudit(audit.id);
    } catch (err) {
      await query(
        `UPDATE audits
         SET status = 'failed', error_message = 'Could not queue audit', finished_at = now()
         WHERE id = $1`,
        [audit.id]
      );
      throw err;
    }
  }

  return audit;
}