import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authService, UserRole } from "@/services/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const isAuth = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuth || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not authorized for this specific admin view, redirect to role-appropriate home
    if (user.role === "teacher" || user.role === "student") {
      return <Navigate to="/timetables" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
