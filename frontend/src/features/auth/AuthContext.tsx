/**
 * Authentication context — provides user state, login, logout, and role checks.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authApi } from '@/api/services';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,
  });

  const setUser = useCallback((user: User | null) => {
    setState({
      user,
      isAuthenticated: !!user,
      isAdmin: !!(user?.is_admin),
      isLoading: false,
    });
  }, []);

  // Restore session from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      try {
        const user: User = JSON.parse(stored);
        setUser(user);
        // Verify token is still valid
        authApi.me().then((res) => {
          const freshUser = res.data.data ?? user;
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }).catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
        });
      } catch {
        setUser(null);
      }
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [setUser]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { access, refresh, user } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }, [setUser]);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token');
    try {
      if (refresh) await authApi.logout(refresh);
    } catch { /* silent */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  }, [setUser]);

  const refreshUser = useCallback(async () => {
    const res = await authApi.me();
    const user = res.data.data!;
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
