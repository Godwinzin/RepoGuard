import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import Logo from "./Logo";
import { ErrorState } from "./ErrorState";

export default function ProtectedRoute() {
  const { user, loading, error, retry } = useAuth();

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

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}