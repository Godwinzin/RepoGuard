import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./toast/ToastProvider";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddRepos from "./pages/AddRepos";
import RepoDetail from "./pages/RepoDetail";
import Report from "./pages/Report";
import Docs from "./pages/Docs";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Goodbye from "./pages/Goodbye";
import Repositories from "./pages/Repositories";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Public pages: readable without logging in */}
            <Route element={<PublicLayout wide />}>
              <Route path="docs" element={<Docs />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
            </Route>
            <Route element={<PublicLayout />}>
              <Route path="goodbye" element={<Goodbye />} />
            </Route>

            {/* The app: needs a logged-in user, and shares the Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="repositories" element={<Repositories />} />
                <Route path="repos/add" element={<AddRepos />} />
                <Route path="repos/:id" element={<RepoDetail />} />
                <Route path="audits/:auditId" element={<Report />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Anything else */}
            <Route element={<PublicLayout />}>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
