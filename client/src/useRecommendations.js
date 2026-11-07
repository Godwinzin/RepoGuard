import { useEffect, useState } from "react";
import { api } from "./api";

const POLL_MS = 2500;

export function useRecommendations(auditId) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function load() {
      try {
        const data = await api(`/audits/${auditId}/recommendations`);
        if (cancelled) return;
        setState({ data, loading: false, error: null });

        // Keep checking while anything is still being generated
        if (data.some((r) => r.status === "queued" || r.status === "running")) {
          timer = setTimeout(load, POLL_MS);
        }
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err }));
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auditId, version]);

  // Show a just-requested item immediately, then restart the polling
  function put(rec) {
    setState((s) => ({
      ...s,
      data: [...s.data.filter((r) => r.type !== rec.type), rec],
    }));
    setVersion((v) => v + 1);
  }

  function retry() {
    setState({ data: [], loading: true, error: null });
    setVersion((v) => v + 1);
  }

  return { ...state, put, retry };
}
