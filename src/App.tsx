import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import { ProtectedRoute } from "./comoponents/ProtectedRoute";
import LoginPage from "./comoponents/pages/login/Login";

import { checkAuth } from "./store/slices/authSlice";
import type { RootState, AppDispatch } from "./store";
import MainLayout from "./comoponents/layouts/MainLayout";
import Board from "./comoponents/pages/dashboard/Board";
import Calendar from "./comoponents/pages/calendar/Calendar";
import Assistant from "./comoponents/pages/assistant/Assistant";
import Home from "./comoponents/pages/home/home";
import LivekitPageWrapper from "./comoponents/pages/livekit/LivekitPageWrapper";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthChecked } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (user && (location.pathname === "/" || location.pathname === "/login")) {
      navigate("/home", { replace: true });
    }
  }, [isAuthChecked, user, location.pathname, navigate]);

  if (!isAuthChecked) return <div>Loading...</div>;

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<Home />} />
        <Route path="boards" element={<Board />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="livekit/:room/:token" element={<LivekitPageWrapper />} />
      </Route>
    </Routes>
  );
}

export default App;
