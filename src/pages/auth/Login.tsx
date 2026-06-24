import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Logo } from '@/components/ui/Logo';
import { useUIStore } from '@/stores/uiStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const toast = useUIStore((s) => s.toast);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast('Configura Supabase en tu archivo .env', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast(error.message, 'error');
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ios-bg px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Logo size={76} />
          </div>
          <h1 className="text-2xl font-bold text-ios-text">DUO OS</h1>
          <p className="mt-1 text-sm text-ios-text-3">El sistema operativo de tu agencia</p>
        </div>

        {/* Opción principal */}
        <GoogleSignInButton label="Continuar con Google" />

        {/* Separador */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-ios-sep" />
          <span className="text-xs text-ios-text-3">o con tu correo</span>
          <div className="h-px flex-1 bg-ios-sep" />
        </div>

        {!showEmail ? (
          <Button variant="secondary" size="lg" className="w-full" onClick={() => setShowEmail(true)}>
            Usar correo y contraseña
          </Button>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@agencia.com"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Iniciar sesión
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ios-text-3">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-brand">
            Crear cuenta
          </Link>
        </p>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-ios-text-3">
          © {new Date().getFullYear()} DUO · Agencia de Marketing · Bolivia
          <br />
          Desarrollado por Emanuel Baldiviezo
        </p>
      </div>
    </div>
  );
}
