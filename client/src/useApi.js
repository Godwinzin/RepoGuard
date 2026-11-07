import { useEffect, useState } from "react";
import { api } from "./api";

export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api(path)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: err, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [path, version]);

  // If we already have data, keep showing it while the fresh data loads.
  // If the last attempt failed, show the loading state again.
  function reload() {
    setState((s) => (s.error ? { data: null, error: null, loading: true } : s));
    setVersion((v) => v + 1);
  }

  return { ...state, reload };
}