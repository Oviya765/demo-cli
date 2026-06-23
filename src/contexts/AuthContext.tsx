import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser, UserRole } from '../models/types';
import { decodeJwt } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (user: AuthUser) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'clinic_flow_token';

// Purge any legacy/non-token data written by older versions of the app so that
// only the JWT token is ever persisted in the browser.
function purgeStaleStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key !== TOKEN_KEY) localStorage.removeItem(key);
    });
  } catch {
    // storage may be unavailable
  }
  try {
    Object.keys(sessionStorage).forEach((key) => {
      // keep only the lightweight theme preference ('light' | 'dark')
      if (key !== 'clinic_flow_theme') sessionStorage.removeItem(key);
    });
  } catch {
    // storage may be unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage (only JWT token is stored)
    purgeStaleStorage();
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const decoded = decodeJwt(token);
        if (decoded) {
          setUser({
            userId: decoded.userId,
            name: decoded.name,
            email: decoded.sub,
            role: decoded.role as UserRole,
            token,
            needsPasswordChange: decoded.needsPasswordChange,
          });
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginUser = (authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem(TOKEN_KEY, authUser.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginUser, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
