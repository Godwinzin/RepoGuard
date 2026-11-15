import { Link, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import NavDrawer from "./NavDrawer";
import { BookIcon, FolderIcon, HomeIcon, LayoutIcon, SettingsIcon } from "./icons";

function pageName(pathname) {
  if (pathname === "/") return "Overview";
  if (pathname.startsWith("/repos/add")) return "Add repository";
  if (pathname.startsWith("/repositories")) return "Repositories";
  if (pathname.startsWith("/repos/")) return "Repository";
  if (pathname.startsWith("/audits/")) return "Report";
  if (pathname.startsWith("/settings")) return "Settings";
  return "";
}

export default function Layout() {
  const { pathname } = useLocation();
  const crumb = pageName(pathname);

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
          {/* key: the drawer starts closed again after every page change */}
          <NavDrawer key={pathname} items={navItems} />

          <Link to="/" className="brand brand-mobile" aria-label="RepoGuard home">
            <Logo />
          </Link>

          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/" aria-label="Overview">
              <HomeIcon size={16} />
            </Link>
            {crumb && (
              <>
                <span aria-hidden="true">›</span>
                <strong>{crumb}</strong>
              </>
            )}
          </nav>

          <div className="topbar-actions">
            <NotificationBell />
            <UserMenu />
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