import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { LoadingDots } from '@/components/ui/LoadingDots';

export function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [status, setStatus] = useState('Conectando con Google Calendar…');

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    async function exchange() {
      if (error || !code) {
        toast('No se pudo conectar Google Calendar', 'error');
        navigate('/perfil', { replace: true });
        return;
      }
      try {
        // La Edge Function hace el intercambio code -> tokens (server-side).
        const { error: fnError } = await supabase.functions.invoke('google-oauth-exchange', {
          body: { code, user_id: user?.id },
        });
        if (fnError) throw fnError;
        setStatus('¡Conectado!');
        toast('Google Calendar conectado', 'success');
      } catch {
        toast('No se pudo completar la conexión', 'error');
      } finally {
        navigate('/perfil', { replace: true });
      }
    }

    exchange();
  }, [params, navigate, user, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ios-bg">
      <LoadingDots />
      <p className="text-sm text-ios-text-3">{status}</p>
    </div>
  );
}
