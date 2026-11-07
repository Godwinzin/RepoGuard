import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./ToastContext";

const DURATION = { error: 9000, success: 4000, info: 5000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type, message) => {
      const id = nextId.current++;

      // Don't stack identical messages
      setToasts((list) =>
        list.some((t) => t.message === message) ? list : [...list, { id, type, message }]
      );

      setTimeout(() => dismiss(id), DURATION[type]);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      error: (message) => show("error", message),
      success: (message) => show("success", message),
      info: (message) => show("info", message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role={t.type === "error" ? "alert" : "status"}
          >
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss message"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}