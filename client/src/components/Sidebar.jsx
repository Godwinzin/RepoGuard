import { Link } from "react-router-dom";
import Logo from "./Logo";
import { BookIcon } from "./icons";

export default function Sidebar({ items }) {
  return (
    <aside className="sidebar">
      <Link to="/" className="brand sidebar-brand" aria-label="RepoGuard home">
        <Logo />
      </Link>

      <nav className="side-nav" aria-label="Main">
        {items.map(({ to, label, icon: Icon, active }) => (
          <Link
            key={to}
            to={to}
            className={`side-link ${active ? "side-link-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="side-card">
        <span className="side-card-icon">
          <BookIcon size={18} />
        </span>
        <strong>How scoring works</strong>
        <p>See what each severity costs and what every check means.</p>
        <Link to="/docs#scoring" className="side-card-link">
          Read the docs →
        </Link>
      </div>
    </aside>
  );
}
