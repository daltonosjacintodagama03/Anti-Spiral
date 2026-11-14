import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import HomePage from '@/features/home/HomePage';
import NotFound from '@/routes/NotFound';
import AuthPage from '@/features/auth/AuthPage';
import { AuthProvider, RequireAccess } from '@/features/auth/auth';

const WorkspacePage = lazy(() => import('@/features/workspace/WorkspacePage'));

export default function App() {
  return (
    <AuthProvider><BrowserRouter>
      <Suspense fallback={<p className="state" aria-busy="true">A carregar…</p>}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="acesso" element={<AuthPage />} />
            <Route path="planeje/:section?" element={<RequireAccess access="planeje"><WorkspacePage mode="planeje" /></RequireAccess>} />
            <Route path="estude/:section?" element={<RequireAccess access="estude"><WorkspacePage mode="estude" /></RequireAccess>} />
            <Route path="explore/:section?" element={<RequireAccess access="explore"><WorkspacePage mode="explore" /></RequireAccess>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter></AuthProvider>
  );
}
