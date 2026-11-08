import { Component } from "react";
import { AlertIcon } from "./icons";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  // React calls this when anything below us crashes while rendering
  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Render error:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="splash">
        <div className="state-box" role="alert">
          <div className="state-icon state-icon-error">
            <AlertIcon size={28} />
          </div>
          <h2>Something went wrong</h2>
          <p>The page hit an unexpected problem. Reloading usually fixes it.</p>
          <div className="state-actions">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}