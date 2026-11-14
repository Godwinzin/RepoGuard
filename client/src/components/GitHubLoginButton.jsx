import { useEffect, useState } from "react";

export default function GitHubLoginButton({ size = "lg", block = false }) {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Pressing Back from GitHub can restore this page from the browser cache,
    // with the button still stuck in its "redirecting" state
    function onPageShow(event) {
      if (event.persisted) setRedirecting(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  function handleClick(event) {
    if (redirecting) {
      event.preventDefault(); // ignore a second click
      return;
    }
    setRedirecting(true);
  }

  return (
    // A normal link, not <Link>: this leaves the React app and goes to the server
    <a
      className={`btn btn-primary btn-${size}${block ? " btn-block" : ""}`}
      href="/api/auth/github"
      onClick={handleClick}
      aria-disabled={redirecting}
    >
      {redirecting && <span className="btn-spinner" aria-hidden="true" />}
      <span>{redirecting ? "Redirecting to GitHub…" : "Continue with GitHub"}</span>
    </a>
  );
}