import { useCallback, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useToast } from "../toast/useToast";
import { useDismiss } from "../useDismiss";
import { ChevronDownIcon, ExternalIcon, LogOutIcon, UserIcon } from "./icons";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapperRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapperRef, open, close);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout(); // the protected pages then send the user to the login screen
    } catch (err) {
      toast.error(err.message);
      setLoggingOut(false);
    }
  }

  return (
    <div className="user-menu" ref={wrapperRef}>
      <button
        type="button"
        className="avatar-btn"
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img src={user.avatar_url} alt="" className="avatar" />
        <span className="avatar-caret">
          <ChevronDownIcon size={14} />
        </span>
      </button>

      {open && (
        <div className="popover" role="region" aria-label="Account">
          <div className="popover-head">
            <img src={user.avatar_url} alt="" className="avatar avatar-lg" />
            <div className="popover-id">
              <strong>{user.name || user.login}</strong>
              <span className="muted-small">@{user.login}</span>
            </div>
          </div>

          <a
            className="popover-item"
            href={`https://github.com/${encodeURIComponent(user.login)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UserIcon size={16} />
            <span>View GitHub profile</span>
            <span className="popover-ext">
              <ExternalIcon size={14} />
            </span>
          </a>

          <button
            type="button"
            className="popover-item popover-item-danger"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : (
              <LogOutIcon size={16} />
            )}
            <span>{loggingOut ? "Logging out…" : "Log out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}