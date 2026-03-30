import { Navigate, Outlet } from "react-router-dom";

import { isAuthenticated } from "../../lib/auth";

export function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/auth/login" replace />;
}

export function GuestOnlyRoute() {
  return isAuthenticated() ? <Navigate to="/home" replace /> : <Outlet />;
}

export function LandingRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/home" replace /> : children;
}
