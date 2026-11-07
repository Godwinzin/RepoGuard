import { Link } from "react-router-dom";
import Button from "./Button";

// A full "this didn't work" panel, with a way forward
export function ErrorState({ error, onRetry, showHome = true }) {
  const notFound = error?.status === 404;

  return (
    <div className="state-box" role="alert">
      <div className="state-icon state-icon-error">
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
      </div>
      <h2>{notFound ? "We couldn't find that" : "Something went wrong"}</h2>
      <p>{error?.message ?? "Please try again."}</p>
      <div className="state-actions">
        {!notFound && onRetry && <Button onClick={onRetry}>Try again</Button>}
        {showHome && (
          <Link to="/" className="btn btn-secondary btn-md">
            Back to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

// A smaller inline message, for failed actions (a button click)
export function Alert({ children }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  );
}