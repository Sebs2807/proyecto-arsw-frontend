import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { ProtectedRoute } from "./comoponents/ProtectedRoute";
import LoginPage from "./comoponents/pages/login/LoginPage";
import Dashboard from "./comoponents/pages/Dashboard";
import RegisterPage from "./comoponents/pages/register/RegisterPage";
import { checkAuth } from "./store/authSlice";
import type { AppDispatch, RootState } from "./store";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, user, isAuthChecked } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    dispatch(checkAuth());
    console.log("Checking auth status...");
  }, [dispatch]);

  useEffect(() => {
    if (isAuthChecked && user) {
      navigate("/dashboard");
    }
  }, [isAuthChecked, user, navigate]);

  if (loading) {
    return <div>Cargando sesión...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
