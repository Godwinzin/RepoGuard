import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../toast/useToast";
import { timeAgo } from "../format";
import { BellIcon, XIcon } from "./icons";

const REFRESH_MS = 60_000;

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Load now, then once a minute, and whenever the browser tab regains focus
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api("/notifications");
        if (!cancelled) setItems(data);
      } catch {
        // The bell fails quietly: a missing badge isn't worth interrupting anyone
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener("focus", load);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);

  // Close on a click outside, or on the Escape key
  useEffect(() => {
    if (!open) return;

    function close() {
      setOpen(false);
      setConfirmingClear(false);
    }
    function onPointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) close();
    }
    function onKeyDown(event) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  function toggleOpen() {
    setOpen((o) => !o);
    setConfirmingClear(false);
  }

  function openItem(notification) {
    setOpen(false);

    if (!notification.read_at) {
      // Optimistic update: change the screen first, tell the server in the background
      const readAt = new Date().toISOString();
      setItems((list) =>
        list.map((n) => (n.id === notification.id ? { ...n, read_at: readAt } : n))
      );
      api(`/notifications/${notification.id}/read`, { method: "POST" }).catch(() => {});
    }

    if (notification.audit_id) navigate(`/audits/${notification.audit_id}`);
  }

  async function markAllRead() {
    const before = items;
    const readAt = new Date().toISOString();
    setItems((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: readAt })));

    try {
      await api("/notifications/read-all", { method: "POST" });
    } catch (err) {
      setItems(before); // put things back if the server said no
      toast.error(err.message);
    }
  }

  async function deleteOne(notification) {
    const before = items;
    setItems((list) => list.filter((n) => n.id !== notification.id));

    try {
      await api(`/notifications/${notification.id}`, { method: "DELETE" });
    } catch (err) {
      setItems(before);
      toast.error(err.message);
    }
  }

  async function deleteAll() {
    const before = items;
    setItems([]);
    setConfirmingClear(false);

    try {
      await api("/notifications", { method: "DELETE" });
    } catch (err) {
      setItems(before);
      toast.error(err.message);
    }
  }

  return (
    <div className="bell" ref={wrapperRef}>
      <button
        type="button"
        className="icon-btn"
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <BellIcon size={20} />
        {unread > 0 && <span className="badge-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="dropdown" role="region" aria-label="Notifications">
          <div className="dropdown-head">
            {confirmingClear ? (
              <>
                <strong>Delete all notifications?</strong>
                <div className="dropdown-actions">
                  <button type="button" className="link-btn" onClick={() => setConfirmingClear(false)}>
                    Cancel
                  </button>
                  <button type="button" className="link-btn link-btn-danger" onClick={deleteAll}>
                    Delete all
                  </button>
                </div>
              </>
            ) : (
              <>
                <strong>Notifications</strong>
                {items.length > 0 && (
                  <div className="dropdown-actions">
                    {unread > 0 && (
                      <button type="button" className="link-btn" onClick={markAllRead}>
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      className="link-btn link-btn-danger"
                      onClick={() => setConfirmingClear(true)}
                    >
                      Delete all
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {items.length === 0 ? (
            <p className="dropdown-empty">
              You're all caught up. We'll tell you here when a push introduces new problems.
            </p>
          ) : (
            <ul className="dropdown-list">
              {items.map((n) => (
                <li key={n.id} className="note-row">
                  <button
                    type="button"
                    className={`note ${n.read_at ? "" : "note-unread"}`}
                    onClick={() => openItem(n)}
                  >
                    <span className="note-title">{n.title}</span>
                    <span className="note-body">{n.body}</span>
                    <span className="note-time">{timeAgo(n.created_at)}</span>
                  </button>

                  {/* A separate button next to the row. A button can't live inside another button. */}
                  <button
                    type="button"
                    className="note-x"
                    aria-label={`Delete notification: ${n.title}`}
                    onClick={() => deleteOne(n)}
                  >
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}