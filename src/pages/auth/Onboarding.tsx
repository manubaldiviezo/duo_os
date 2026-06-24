import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const COLORS = ['#F2741B', '#FF2D55', '#34C759', '#007AFF', '#AF52DE', '#FFCC00'];

const DEMO_CLIENTS = [
  { name: 'Femmeninas', industry: 'Moda/Femenino', monthly_fee: 800, services: ['estrategia', 'contenido', 'meta_ads'] },
  { name: 'Chocolate Éxtasis', industry: 'Gastronomía', monthly_fee: 200, services: ['contenido', 'meta_ads'] },
  { name: 'VisionArq', industry: 'Arquitectura', monthly_fee: 200, services: ['contenido', 'estrategia'] },
  { name: 'Jimmy Durán', industry: 'Personal Brand', monthly_fee: 350, services: ['estrategia', 'contenido', 'meta_ads'] },
  { name: 'Rennacer Insumos', industry: 'Insumos B2B', monthly_fee: 250, services: ['estrategia', 'contenido', 'reportes'] },
  { name: 'Aloha Mental', industry: 'Salud Mental', monthly_fee: 50, services: ['contenido'] },
  { name: 'Odontología', industry: 'Salud Dental', monthly_fee: 70, services: ['contenido', 'meta_ads'] },
  { name: 'ProgamingEC', industry: 'Gaming/Educación', monthly_fee: 150, services: ['estrategia', 'contenido'] },
  { name: 'Climere', industry: 'Por definir', monthly_fee: 50, services: ['contenido'] },
];

export function Onboarding() {
  const { user, profile, setProfile } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const [step, setStep] = useState(0);
  const [agencyName, setAgencyName] = useState(profile?.agency_name ?? '');
  const [userName, setUserName] = useState(profile?.user_name ?? '');
  const [color, setColor] = useState('#F2741B');
  const [loading, setLoading] = useState(false);

  async function finish(loadDemo: boolean) {
    if (!user) return;
    setLoading(true);

    await supabase
      .from('profiles')
      .update({
        agency_name: agencyName || 'Mi Agencia',
        user_name: userName || 'Usuario',
        brand_color: color,
        onboarding_completed: true,
      })
      .eq('id', user.id);

    if (loadDemo) {
      const { data: inserted } = await supabase
        .from('clients')
        .insert(
          DEMO_CLIENTS.map((c) => ({ ...c, user_id: user.id, status: 'active' }))
        )
        .select('id, monthly_fee, name');

      if (inserted?.length) {
        await supabase.from('transactions').insert(
          inserted.map((c) => ({
            user_id: user.id,
            client_id: c.id,
            type: 'pending_income',
            amount: c.monthly_fee,
            description: `Mensualidad - ${c.name}`,
            category: 'mensualidad',
            is_recurring: true,
            recurring_day: 1,
          }))
        );
      }
    }

    const { data: fresh } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(fresh ?? null);
    setLoading(false);
    toast('¡Todo listo! Bienvenido a DUO OS', 'success');
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ios-bg px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-brand' : 'bg-ios-text-3/25')}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-ios-text">Configura tu agencia</h1>
            <Input
              label="Nombre de la agencia"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Agencia DUO"
            />
            <Input
              label="Tu nombre"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Emanuel"
            />
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              Continuar
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-ios-text">Color de marca</h1>
            <div className="grid grid-cols-3 gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-16 rounded-2xl transition-transform active:scale-95',
                    color === c && 'ring-4 ring-offset-2 ring-offset-ios-bg'
                  )}
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 4px ${c}40` : undefined }}
                />
              ))}
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-ios-text">¡Todo listo!</h1>
            <p className="text-sm text-ios-text-3">
              Tu espacio arranca limpio. Después, desde la pestaña <b>IA</b> puedes tocar
              “Configurar mi agencia” y el asistente te ayuda a cargar tus clientes y tareas.
            </p>
            <Button size="lg" className="w-full" loading={loading} onClick={() => finish(false)}>
              Entrar a DUO OS
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
