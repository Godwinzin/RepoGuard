import { Link } from "react-router-dom";
import Logo from "./Logo";
import { SITE } from "../site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo size={22} />
          <span>Audit your repositories. Fix what matters.</span>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link to="/docs">Docs</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`mailto:${SITE.contactEmail}`}>Contact</a>
        </nav>
      </div>

      <p className="footer-fine">
        © {new Date().getFullYear()} {SITE.name} · MIT licensed · Not affiliated
        with GitHub.
      </p>
    </footer>
  );
}
