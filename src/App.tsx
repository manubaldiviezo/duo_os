import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { applyTheme } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { ToastContainer } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingDots';

import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { Onboarding } from '@/pages/auth/Onboarding';
import { GoogleCallback } from '@/pages/auth/GoogleCallback';
import { Home } from '@/pages/Home';
import { Tasks } from '@/pages/Tasks';
import { Assistant } from '@/pages/Assistant';
import { Clients } from '@/pages/Clients';
import { ClientDetail } from '@/pages/ClientDetail';
import { Finance } from '@/pages/Finance';
import { Profile } from '@/pages/Profile';
import { Plans } from '@/pages/Plans';
import { Ideas } from '@/pages/Ideas';

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
              <Route path="/planes" element={<Plans />} />
              <Route path="/perfil" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}
