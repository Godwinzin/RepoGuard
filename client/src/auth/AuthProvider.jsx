import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api("/auth/me")
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;

        if (err instanceof ApiError && err.status === 401) {
          // The server answered: you are not logged in
          setUser(null);
          setError(null);
        } else {
          // The server didn't answer properly: we can't tell, so don't pretend
          setError("Can't reach the server. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("repoguard:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("repoguard:unauthorized", onUnauthorized);
  }, []);

  // Run the session check again
  function retry() {
    setLoading(true);
    setError(null);
    setVersion((v) => v + 1);
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, retry, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
