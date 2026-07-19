import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { applyTheme } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { CelebrationHost } from '@/components/ui/CelebrationHost';
import { ToastContainer } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingDots';

// Pantallas de auth: carga inmediata (primer render).
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { Onboarding } from '@/pages/auth/Onboarding';
import { GoogleCallback } from '@/pages/auth/GoogleCallback';

// Pantallas internas: carga diferida (mejora la velocidad inicial).
const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const Tasks = lazy(() => import('@/pages/Tasks').then((m) => ({ default: m.Tasks })));
const Assistant = lazy(() => import('@/pages/Assistant').then((m) => ({ default: m.Assistant })));
const Clients = lazy(() => import('@/pages/Clients').then((m) => ({ default: m.Clients })));
const ClientDetail = lazy(() => import('@/pages/ClientDetail').then((m) => ({ default: m.ClientDetail })));
const Finance = lazy(() => import('@/pages/Finance').then((m) => ({ default: m.Finance })));
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })));
const Plans = lazy(() => import('@/pages/Plans').then((m) => ({ default: m.Plans })));
const Ideas = lazy(() => import('@/pages/Ideas').then((m) => ({ default: m.Ideas })));
const Meetings = lazy(() => import('@/pages/Meetings').then((m) => ({ default: m.Meetings })));
const Progress = lazy(() => import('@/pages/Progress').then((m) => ({ default: m.Progress })));

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ios-bg">
      <LoadingDots />
    </div>
  );
}

export default function App() {
  useAuthListener();
  const { session, profile, loading } = useAuthStore();

  // Aplica el tema (color primario, secundario y tipografía) del perfil a toda la app.
  useEffect(() => {
    applyTheme({
      brand_color: profile?.brand_color,
      brand_color_secondary: profile?.brand_color_secondary,
      font_family: profile?.font_family,
    });
  }, [profile?.brand_color, profile?.brand_color_secondary, profile?.font_family]);

  if (loading) return <FullScreenLoader />;

  const authed = Boolean(session);
  const needsOnboarding = authed && profile && !profile.onboarding_completed;

  return (
    <>
      <ToastContainer />
      <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={authed ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {!authed ? (
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : needsOnboarding ? (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <>
            <Route path="/onboarding" element={<Navigate to="/" replace />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/tareas" element={<Tasks />} />
              <Route path="/ia" element={<Assistant />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/finanzas" element={<Finance />} />
              <Route path="/ideas" element={<Ideas />} />
              <Route path="/reuniones" element={<Meetings />} />
              <Route path="/progreso" element={<Progress />} />
              <Route path="/planes" element={<Plans />} />
              <Route path="/perfil" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      </Suspense>
      <CelebrationHost />
    </>
  );
}
