import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../models/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowPasswordChangeOnly?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, allowPasswordChangeOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="page-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user needs password change and isn't accessing /first-login, force redirect
  if (user?.needsPasswordChange && !allowPasswordChangeOnly) {
    return <Navigate to="/first-login" replace />;
  }

  // If user doesn't need password change and tries accessing /first-login, redirect to dashboard
  if (!user?.needsPasswordChange && allowPasswordChangeOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
