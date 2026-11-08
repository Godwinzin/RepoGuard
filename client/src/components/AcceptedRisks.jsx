import { useState } from "react";
import { api } from "../api";
import { useApi } from "../useApi";
import { useToast } from "../toast/useToast";
import { timeAgo } from "../format";
import Button from "./Button";
import { Skeleton } from "./Skeleton";

export default function AcceptedRisks({ repoId, onChanged }) {
  const { data, error, loading, reload } = useApi(`/repos/${repoId}/accepted-findings`);
  const toast = useToast();
  const [removing, setRemoving] = useState(null);

  async function remove(item) {
    setRemoving(item.id);

    try {
      await api(
        `/repos/${repoId}/accepted-findings?fingerprint=${encodeURIComponent(item.fingerprint)}`,
        { method: "DELETE" }
      );
      toast.success("Removed. If the problem still exists, it counts toward the score again.");
      reload();
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return <Skeleton height={110} radius="14px" />;

  return (
    <div className="panel monitor">
      <h2>Accepted risks</h2>

      {error ? (
        <p className="muted-small accepted-empty">{error.message}</p>
      ) : data.length === 0 ? (
        <p className="muted-small accepted-empty">
          Nothing accepted. When you accept a risk on a report, it appears here and stops
          counting against the score.
        </p>
      ) : (
        <ul className="accepted-list">
          {data.map((item) => (
            <li key={item.id} className="accepted-item">
              <div className="accepted-item-main">
                <strong>{item.title}</strong>
                {item.file_path && <code>{item.file_path}</code>}
                <p className="muted-small">
                  {item.reason || "No reason given."} · {timeAgo(item.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(item)}
                loading={removing === item.id}
                disabled={removing !== null}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}