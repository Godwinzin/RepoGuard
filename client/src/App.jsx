import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./toast/ToastProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddRepos from "./pages/AddRepos";
import RepoDetail from "./pages/RepoDetail";
import Report from "./pages/Report";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                {/* "add" is a fixed word, so it wins over the :id pattern below */}
                <Route path="repos/add" element={<AddRepos />} />
                <Route path="repos/:id" element={<RepoDetail />} />
                <Route path="audits/:auditId" element={<Report />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}