import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '@/services/http';
export type Access = 'planeje' | 'estude' | 'explore';
export interface Session { id: string; name: string; email: string; access: Access }
const SessionContext = createContext<{session:Session|null;loading:boolean;setSession:(value:Session)=>void;logout:()=>Promise<void>}>({session:null,loading:true,setSession:()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}) {
  const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;api<Session>('/auth/me').then(value=>{if(active)setSession(value);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  async function logout(){await api('/auth/logout',{method:'POST'});setSession(null);}
  return <SessionContext.Provider value={{session,loading,setSession,logout}}>{children}</SessionContext.Provider>;
}
export function useAuth(){return useContext(SessionContext);}
export function RequireAccess({children,access}:{children:ReactNode;access:Access}) {
  const {session,loading}=useAuth();const location=useLocation();
  if(loading)return <p role="status">A verificar sessão…</p>;
  if(!session)return <Navigate to={`/acesso?perfil=${access}`} replace state={{from:location.pathname+location.search}}/>;
  // Audience is a presentation preference, never a backend permission.
  return <>{children}</>;
}
