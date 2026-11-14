import { Link, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import NavDrawer from "./NavDrawer";
import { BookIcon, FolderIcon, LayoutIcon, SettingsIcon } from "./icons";

export default function Layout() {
  const { pathname } = useLocation();

  const navItems = [
    { to: "/", label: "Overview", icon: LayoutIcon, active: pathname === "/" },
    {
      to: "/repositories",
      label: "Repositories",
      icon: FolderIcon,
      // repository pages, report pages and "add repository" all belong to this section
      active:
        pathname.startsWith("/repositories") ||
        pathname.startsWith("/repos") ||
        pathname.startsWith("/audits"),
    },
    { to: "/settings", label: "Settings", icon: SettingsIcon, active: pathname.startsWith("/settings") },
    { to: "/docs", label: "Docs", icon: BookIcon, active: false },
  ];

  return (
    <div className="shell">
      <Sidebar items={navItems} />

      <div className="shell-main">
        <header className="app-topbar">
          <Link to="/" className="brand brand-mobile" aria-label="RepoGuard home">
            <Logo />
          </Link>

          <GlobalSearch />

          <div className="topbar-actions">
            <NotificationBell />
            <UserMenu />
            {/* key: the drawer starts closed again after every page change */}
            <NavDrawer key={pathname} items={navItems} />
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}