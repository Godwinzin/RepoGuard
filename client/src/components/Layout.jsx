import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Logo from "./Logo";
import Button from "./Button";
import NotificationBell from "./NotificationBell";
import { FolderIcon, PlusIcon } from "./icons";

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  // "Repositories" stays highlighted on repository and report pages too
  const onAdd = pathname.startsWith("/repos/add");

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="RepoGuard home">
            <Logo />
          </Link>

          <nav className="nav" aria-label="Main">
            <Link
              to="/"
              title="Repositories"
              aria-label="Repositories"
              className={`nav-link ${onAdd ? "" : "nav-link-active"}`}
              aria-current={onAdd ? undefined : "page"}
            >
              <FolderIcon size={16} />
              <span>Repositories</span>
            </Link>
            <Link
              to="/repos/add"
              title="Add repository"
              aria-label="Add repository"
              className={`nav-link ${onAdd ? "nav-link-active" : ""}`}
              aria-current={onAdd ? "page" : undefined}
            >
              <PlusIcon size={16} />
              <span>Add repository</span>
            </Link>
          </nav>

          <div className="topbar-user">
            <NotificationBell />
            <img src={user.avatar_url} alt="" className="avatar" title={user.login}/>
            <span className="topbar-name">{user.login}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} loading={loggingOut}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}