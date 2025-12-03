import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthChecked } = useSelector((state: RootState) => state.auth);

  if (!isAuthChecked) return <div>Cargando sesión...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};
