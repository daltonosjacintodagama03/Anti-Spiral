import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export type Access = 'planeje' | 'estude' | 'explore';
export interface Session { name: string; email: string; access: Access }
const KEY = 'sai-moon-session';
const SessionContext = createContext<{ session: Session | null; setSession: (value: Session | null) => void }>({ session: null, setSession: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') as Session | null; } catch { return null; }
  });
  const setSession = (value: Session | null) => {
    if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY);
    setSessionState(value);
  };
  return <SessionContext.Provider value={{ session, setSession }}>{children}</SessionContext.Provider>;
}

export function useAuth() { return useContext(SessionContext); }

export function RequireAccess({ children, access }: { children: ReactNode; access: Access }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to={`/acesso?perfil=${access}`} replace state={{ from: location.pathname }} />;
  if (session.access !== access) return <Navigate to={`/${session.access}`} replace />;
  return <>{children}</>;
}
