import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { usePageTitle } from "../usePageTitle";
import GitHubLoginButton from "../components/GitHubLoginButton";
import ProductArt from "../components/ProductArt";
import Logo from "../components/Logo";
import { Alert, ErrorState } from "../components/ErrorState";
import { CheckCircleIcon } from "../components/icons";

const POINTS = [
  "Finds committed secrets and exposed .env files",
  "Flags vulnerable and outdated dependencies",
  "Re-audits on every push and tells you what's new",
];

// Only these messages can ever appear. We never print text taken from the URL.
const LOGIN_ERRORS = {
  access_denied:
    "You cancelled the GitHub login. Click the button when you're ready.",
  session: "That login attempt expired or was started twice. Please try again.",
  failed:
    "We couldn't complete the login with GitHub. Please try again in a moment.",
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
        <ErrorState
          error={{ message: error }}
          onRetry={retry}
          showHome={false}
        />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const loginError = LOGIN_ERRORS[params.get("error")]; // undefined for anything unknown

  return (
    <div className="login-split">
      <section className="login-art">
        <div className="login-art-copy">
          <h2>Catch the problems hiding in your repositories.</h2>
          <p>
            Secrets, vulnerable packages and missing basics, explained in plain
            English with the exact fix.
          </p>
        </div>
        <ProductArt />
      </section>

      <section className="login-panel">
        <div className="login-form">
          <Logo size={34} />
          <h1>Welcome to RepoGuard</h1>
          <p className="subtitle">
            Sign in with GitHub to audit your repositories.
          </p>

          {loginError && <Alert>{loginError}</Alert>}

          <GitHubLoginButton block />

          <ul className="login-points">
            {POINTS.map((text) => (
              <li key={text}>
                <CheckCircleIcon size={18} />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <p className="fine-print">
            We only read public repositories. <Link to="/docs">Docs</Link> ·{" "}
            <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
