'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AuthMode = 'guest' | 'logged_in';

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextValue {
  mode: AuthMode;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  exitAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  mode: 'guest',
  user: null,
  login: () => {},
  logout: () => {},
  exitAsGuest: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = 'docagent-auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode>('guest');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMode(parsed.mode ?? 'guest');
        setUser(parsed.user ?? null);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persist = (m: AuthMode, u: AuthUser | null) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: m, user: u }));
  };

  const login = useCallback((u: AuthUser) => {
    setMode('logged_in');
    setUser(u);
    persist('logged_in', u);
  }, []);

  const logout = useCallback(() => {
    setMode('guest');
    setUser(null);
    persist('guest', null);
    // Redirect to home
    window.location.href = '/';
  }, []);

  const exitAsGuest = useCallback(() => {
    // Clear session and go home
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ mode, user, login, logout, exitAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}
