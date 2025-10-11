import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import { ProtectedRoute } from "./comoponents/ProtectedRoute";
import LoginPage from "./comoponents/pages/login/LoginPage";
import Dashboard from "./comoponents/pages/Dashboard";
import { checkAuth } from "./store/authSlice";
import type { RootState, AppDispatch } from "./store";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthChecked } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  useEffect(() => {
    // Only proceed once auth state has been checked
    if (!isAuthChecked) return;

    // SCENARIO 1: User is authenticated
    // If user is on / or /login, redirect to /dashboard
    if (user && (location.pathname === "/" || location.pathname === "/login")) {
      navigate("/dashboard", { replace: true });
      return; // Stop here after navigating
    }
  }, [isAuthChecked, user, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
