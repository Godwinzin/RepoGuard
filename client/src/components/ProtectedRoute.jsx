import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Logo from "./Logo";
import PublicLayout from "./PublicLayout";
import Landing from "../pages/Landing";
import { ErrorState } from "./ErrorState";

export default function ProtectedRoute() {
  const { user, loading, error, retry } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="splash">
        <Logo size={44} />
        <span className="spinner" />
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

  if (!user) {
    // The front door: visitors who aren't logged in see the landing page at the root address.
    // Every other protected address still sends them to the login page.
    if (pathname === "/") {
      return (
        <PublicLayout wide>
          <Landing />
        </PublicLayout>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}