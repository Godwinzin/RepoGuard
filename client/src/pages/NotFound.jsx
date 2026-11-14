import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { usePageTitle } from "../usePageTitle";

export default function NotFound() {
  const { user } = useAuth();
  usePageTitle("Page not found");

  return (
    <div className="notfound">
      <p className="notfound-code">404</p>
      <h1>This page doesn't exist</h1>
      <p className="subtitle">The address may be mistyped, or the page may have moved.</p>

      <div className="state-actions">
        <Link to="/" className="btn btn-primary btn-md">
          {user ? "Go to your dashboard" : "Go to the home page"}
        </Link>
        <Link to="/docs" className="btn btn-secondary btn-md">
          Read the docs
        </Link>
      </div>
    </div>
  );
}