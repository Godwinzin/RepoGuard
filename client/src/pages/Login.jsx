import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { usePageTitle } from "../usePageTitle";
import GitHubLoginButton from "../components/GitHubLoginButton";
import Logo from "../components/Logo";
import { Alert, ErrorState } from "../components/ErrorState";

const FEATURES = [
  "Finds committed secrets, exposed .env files and vulnerable dependencies",
  "Checks your README, tests, lockfile and project structure",
  "Watches every push and tells you when new problems appear",
];

// Only these messages can ever appear. We never print text taken from the URL.
const LOGIN_ERRORS = {
  access_denied: "You cancelled the GitHub login. Click the button when you're ready.",
  session: "That login attempt expired or was started twice. Please try again.",
  failed: "We couldn't complete the login with GitHub. Please try again in a moment.",
};

export default function Login() {
  // Hooks first, before any early return
  const { user, loading, error, retry } = useAuth();
  const [params] = useSearchParams();
  usePageTitle("Log in");

  if (loading) {
    return (
      <div className="splash">
        <Logo size={44} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="splash">
        <ErrorState error={{ message: error }} onRetry={retry} showHome={false} />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const loginError = LOGIN_ERRORS[params.get("error")]; // undefined for anything unknown

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo size={40} />
        <h1>Know what's wrong with your repo before anyone else does.</h1>
        <p className="subtitle">
          Connect GitHub and get an instant health report for your projects, with a clear
          explanation of every problem and how to fix it.
        </p>

        <ul className="feature-list">
          {FEATURES.map((text) => (
            <li key={text}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <circle cx="10" cy="10" r="10" className="feature-dot" />
                <path
                  d="m5.8 10.4 2.7 2.7 5.2-5.6"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        {loginError && <Alert>{loginError}</Alert>}

        <GitHubLoginButton block />
        <p className="fine-print">
          We only read public repositories. <Link to="/privacy">Privacy</Link> ·{" "}
          <Link to="/terms">Terms</Link>
        </p>
      </div>
    </div>
  );
}