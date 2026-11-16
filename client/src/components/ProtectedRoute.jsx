import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Logo from "./Logo";
import Login from "../pages/Login";
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
    // The front door: logged-out visitors see the sign-in page at the root address.
    // Any other protected address sends them to /login.
    if (pathname === "/") return <Login />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}