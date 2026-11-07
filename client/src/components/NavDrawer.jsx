import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { XIcon } from "./icons";

export default function NavDrawer({ items }) {
  const [open, setOpen] = useState(false);
  const burgerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Stop the page behind the drawer from scrolling, and move focus into the drawer
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus(); // put focus back where the user was
      }
    }

    // If the window becomes wide (a rotated phone, say), the desktop menu takes over
    const wide = window.matchMedia("(min-width: 721px)");
    function onBreakpoint(event) {
      if (event.matches) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  function close() {
    setOpen(false);
    burgerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={burgerRef}
        type="button"
        className="burger"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="nav-drawer"
        onClick={() => setOpen(true)}
      >
        <span className="burger-bar" />
        <span className="burger-bar" />
        <span className="burger-bar" />
      </button>

      {/* A portal renders these straight into <body>, outside the top bar */}
      {createPortal(
        <>
          <div
            className={`drawer-backdrop ${open ? "is-open" : ""}`}
            onClick={close}
            aria-hidden="true"
          />

          <aside
            id="nav-drawer"
            className={`drawer ${open ? "drawer-open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            aria-hidden={!open}
          >
            <div className="drawer-head">
              <Logo />
              <button
                ref={closeRef}
                type="button"
                className="icon-btn drawer-close"
                aria-label="Close menu"
                onClick={close}
              >
                <XIcon size={20} />
              </button>
            </div>

            <nav className="drawer-nav" aria-label="Menu">
              {items.map(({ to, label, icon: Icon, active }) => (
                <Link
                  key={to}
                  to={to}
                  className={`drawer-link ${active ? "drawer-link-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <p className="drawer-foot">Audit your repositories. Fix what matters.</p>
          </aside>
        </>,
        document.body
      )}
    </>
  );
}