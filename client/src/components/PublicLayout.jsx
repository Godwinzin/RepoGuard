import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Logo from "./Logo";
import Footer from "./Footer";

// Used two ways: as a route element (it renders the child route through <Outlet />),
// or wrapped around a page directly (it renders its children)
export default function PublicLayout({ children, wide = false }) {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="RepoGuard home">
            <Logo />
          </Link>

          <nav className="nav" aria-label="Main">
            <Link to="/docs" className="nav-link">
              <BookLabel />
            </Link>
          </nav>

          {user ? (
            <Link to="/" className="btn btn-primary btn-sm">
              Open dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Log in
            </Link>
          )}
        </div>
      </header>

      <main className={`container ${wide ? "" : "container-prose"}`}>
        {children ?? <Outlet />}
      </main>

      <Footer />
    </div>
  );
}

function BookLabel() {
  return <span>Docs</span>;
}