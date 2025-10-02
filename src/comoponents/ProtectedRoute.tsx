import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
};

export const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !user.roles?.some((r) => roles.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
