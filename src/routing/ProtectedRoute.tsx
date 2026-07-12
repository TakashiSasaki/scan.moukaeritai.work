import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { evaluateRouteAccess } from '../auth/authorizationHelper';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, authLoading, isAdmin, authorizationLoading, authorizationError } = useAuth();
  const location = useLocation();

  const access = evaluateRouteAccess({
    authLoading,
    authorizationLoading,
    userPresent: isAuthenticated,
    isAdmin,
    authorizationError: authorizationError !== null
  }, location.pathname);

  if (access === "loading") {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
      </div>
    );
  }

  if (access === "login") {
    return <Navigate to="/" replace />;
  }

  if (access === "forbidden") {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
