import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return null;
  }
  return isSignedIn ? <Outlet /> : <Navigate to="/auth/login" replace />;
}

export function GuestOnlyRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return null;
  }
  return isSignedIn ? <Navigate to="/home" replace /> : <Outlet />;
}

export function LandingRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/home" replace /> : children;
}
