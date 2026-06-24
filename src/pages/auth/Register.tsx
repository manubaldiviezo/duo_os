import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Logo } from '@/components/ui/Logo';
import { useUIStore } from '@/stores/uiStore';

export function Register() {
  const [agencyName, setAgencyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const toast = useUIStore((s) => s.toast);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast('Configura Supabase en tu archivo .env', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_name: userName, agency_name: agencyName } },
    });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Cuenta creada. Revisa tu correo si pide confirmación.', 'success');
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ios-bg px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Logo size={76} />
          </div>
          <h1 className="text-2xl font-bold text-ios-text">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-ios-text-3">Empieza a operar tu agencia</p>
        </div>

        {/* Opción principal */}
        <GoogleSignInButton label="Registrarse con Google" />

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
          <form onSubmit={handleRegister} className="space-y-3">
            <Input
              label="Nombre de tu agencia"
              name="agency"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Agencia DUO"
              required
            />
            <Input
              label="Tu nombre"
              name="username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Emanuel"
              required
            />
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
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Crear cuenta
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ios-text-3">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-brand">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
