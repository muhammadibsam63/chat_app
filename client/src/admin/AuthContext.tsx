import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiClientError, api } from '../lib/api';
import type { AdminUser } from '../lib/types';

interface AuthValue {
  user: AdminUser | null;
  loading: boolean;
  needsSetup: boolean;
  bootstrapFromEnv: boolean;
  error: string | null;
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  bootstrap: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Session state for the console. The server is the authority: this provider
 * only mirrors the HTTP-only cookie session and never grants access itself.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [bootstrapFromEnv, setBootstrapFromEnv] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [me, setup] = await Promise.all([
        api.get<{ user: AdminUser } | null>('/auth/me'),
        api.get<{ needsSetup: boolean; bootstrapFromEnv: boolean }>('/auth/setup-status'),
      ]);
      setUser(me.data?.user ?? null);
      setNeedsSetup(Boolean(setup.data?.needsSetup));
      setBootstrapFromEnv(Boolean(setup.data?.bootstrapFromEnv));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'The API is unreachable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ user: AdminUser }>('/auth/login', { email, password });
    setUser(result.data.user);
    setNeedsSetup(false);
    setError(null);
  }, []);

  const bootstrap = useCallback(async (input: { name: string; email: string; password: string }) => {
    const result = await api.post<{ user: AdminUser }>('/auth/bootstrap', input);
    setUser(result.data.user);
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      const granted = Array.isArray(user.permissions) ? user.permissions : [];
      return user.role === 'admin' || granted.includes('*') || granted.includes(permission);
    },
    [user],
  );

  const value = useMemo<AuthValue>(
    () => ({ user, loading, needsSetup, bootstrapFromEnv, error, can, login, bootstrap, logout, refresh }),
    [user, loading, needsSetup, bootstrapFromEnv, error, can, login, bootstrap, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
