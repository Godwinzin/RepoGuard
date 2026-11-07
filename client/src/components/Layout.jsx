import { Link, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import NavDrawer from "./NavDrawer";
import { FolderIcon, PlusIcon } from "./icons";

export default function Layout() {
  const { pathname } = useLocation();

  // "Repositories" stays highlighted on repository and report pages too
  const onAdd = pathname.startsWith("/repos/add");

  const navItems = [
    { to: "/", label: "Repositories", icon: FolderIcon, active: !onAdd },
    { to: "/repos/add", label: "Add repository", icon: PlusIcon, active: onAdd },
  ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="RepoGuard home">
            <Logo />
          </Link>

          {/* Visible on wide screens only. On phones the drawer holds these links. */}
          <nav className="nav nav-desktop" aria-label="Main">
            {navItems.map(({ to, label, icon: Icon, active }) => (
              <Link
                key={to}
                to={to}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="topbar-actions">
            <NotificationBell />
            <UserMenu />
            {/* key: the drawer starts closed again after every page change */}
            <NavDrawer key={pathname} items={navItems} />
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}