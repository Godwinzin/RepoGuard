import { useEffect } from "react";

// Calls onDismiss when the user clicks outside `ref` or presses Escape, while `active` is true
export function useDismiss(ref, active, onDismiss) {
  useEffect(() => {
    if (!active) return;

    function onPointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onDismiss();
    }
    function onKeyDown(event) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, active, onDismiss]);
}