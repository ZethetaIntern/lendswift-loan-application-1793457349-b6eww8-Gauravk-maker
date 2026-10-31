
import { Navigate, Link, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import AccountSettings from "./pages/AccountSettings";
import LoanApplication from "./LoanApplication";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="auth-loading">Loading LendSwift...</p>;
  }

  return <Navigate to={user ? "/application" : "/login"} replace />;
}
export default function App() {
  return (
    <>


      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/application"
          element={
            <ProtectedRoute>
              <LoanApplication />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
