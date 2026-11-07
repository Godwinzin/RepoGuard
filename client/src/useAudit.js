import { useEffect, useState } from "react";
import { api } from "./api";

const POLL_MS = 2000;

export function useAudit(auditId) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function load() {
      try {
        const data = await api(`/audits/${auditId}`);
        if (cancelled) return;
        setState({ data, error: null, loading: false });

        if (data.status === "queued" || data.status === "running") {
          timer = setTimeout(load, POLL_MS);
        }
      } catch (err) {
        if (!cancelled) setState({ data: null, error: err, loading: false });
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auditId, version]);

  function reload() {
    setState((s) => ({ ...s, error: null, loading: true }));
    setVersion((v) => v + 1);
  }

  return { ...state, reload };
}