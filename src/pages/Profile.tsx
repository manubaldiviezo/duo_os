import { useEffect, useState } from 'react';
import { IconBrandGoogle, IconLogout, IconMail } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { signOut } from '@/hooks/useAuth';
import { initiateGoogleAuth } from '@/lib/googleAuth';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { TeamSection } from '@/components/settings/TeamSection';
import { sendEmail, emailTemplate } from '@/lib/email';
import { applyBrandColor, cn } from '@/lib/utils';

const BRAND_COLORS = ['#F2741B', '#FF2D55', '#34C759', '#007AFF', '#AF52DE', '#FF3B30', '#5856D6', '#FFCC00'];

type AIFeatures = Record<string, boolean>;

const AI_LABELS: Record<string, string> = {
  morning_briefing: 'Briefing matutino',
  churn_detection: 'Detección de churn',
  time_blocking: 'Time blocking',
  pattern_detection: 'Detección de patrones',
  voice_capture: 'Captura por voz',
  mrr_coaching: 'Coaching de MRR',
};

export function Profile() {
  const { user, profile, setProfile } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const [agencyName, setAgencyName] = useState(profile?.agency_name ?? '');
  const [mrrGoal, setMrrGoal] = useState(String(profile?.mrr_goal ?? 3000));
  const [aiFeatures, setAiFeatures] = useState<AIFeatures>({});
  const [calConnected, setCalConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('settings')
      .select('ai_features_enabled, google_calendar_connected')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAiFeatures((data.ai_features_enabled as AIFeatures) ?? {});
          setCalConnected(Boolean(data.google_calendar_connected));
        }
      });
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { data } = await supabase
      .from('profiles')
      .update({ agency_name: agencyName, mrr_goal: Number(mrrGoal) || 0 })
      .eq('id', user.id)
      .select('*')
      .single();
    if (data) setProfile(data);
    setSaving(false);
    toast('Perfil actualizado', 'success');
  }

  async function toggleAi(key: string, value: boolean) {
    if (!user) return;
    const next = { ...aiFeatures, [key]: value };
    setAiFeatures(next);
    await supabase.from('settings').update({ ai_features_enabled: next }).eq('user_id', user.id);
  }

  async function sendTestEmail() {
    if (!user?.email) {
      toast('No encuentro tu correo', 'error');
      return;
    }
    setSendingTest(true);
    const res = await sendEmail({
      to: user.email,
      subject: 'Prueba de correo — DUO OS',
      html: emailTemplate({
        title: '¡El motor de email funciona! 🎉',
        body: 'Si recibiste este correo, tu integración con Resend está lista. Ya podemos enviar confirmaciones de tareas y recordatorios automáticos.',
      }),
    });
    setSendingTest(false);
    if (res.success) {
      toast('Correo de prueba enviado. Revisa tu bandeja.', 'success');
    } else {
      toast(res.error ?? 'No se pudo enviar', 'error');
    }
  }

  async function changeColor(hex: string) {
    if (!user) return;
    applyBrandColor(hex); // cambio inmediato en pantalla
    if (profile) setProfile({ ...profile, brand_color: hex });
    await supabase.from('profiles').update({ brand_color: hex }).eq('id', user.id);
    toast('Color actualizado', 'success');
  }

  return (
    <div>
      <TopBar title="Perfil" subtitle={profile?.agency_name} />

      <div className="space-y-5 px-5 pt-2">
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-ios-text-2">Agencia</h2>
          <Input label="Nombre de la agencia" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
          <Input
            label="Objetivo de MRR (USD)"
            type="number"
            value={mrrGoal}
            onChange={(e) => setMrrGoal(e.target.value)}
          />
          <Button size="sm" loading={saving} onClick={saveProfile}>
            Guardar cambios
          </Button>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-ios-text-2">Color de marca</h2>
          <div className="flex flex-wrap gap-3">
            {BRAND_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => changeColor(c)}
                className={cn(
                  'h-10 w-10 rounded-full transition-transform active:scale-90',
                  profile?.brand_color?.toLowerCase() === c.toLowerCase() &&
                    'ring-2 ring-offset-2 ring-offset-ios-card'
                )}
                style={{
                  backgroundColor: c,
                  boxShadow:
                    profile?.brand_color?.toLowerCase() === c.toLowerCase() ? `0 0 0 3px ${c}` : undefined,
                }}
                aria-label={`Color ${c}`}
              />
            ))}
            <label
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-ios-text-3 text-xs text-ios-text-3"
              title="Color personalizado"
            >
              +
              <input
                type="color"
                className="sr-only"
                value={profile?.brand_color ?? '#7F77DD'}
                onChange={(e) => changeColor(e.target.value)}
              />
            </label>
          </div>
        </Card>

        <TeamSection />

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-ios-text-2">Funciones de IA</h2>
          {Object.keys(AI_LABELS).map((key) => (
            <Toggle
              key={key}
              label={AI_LABELS[key]}
              checked={aiFeatures[key] ?? true}
              onChange={(v) => toggleAi(key, v)}
            />
          ))}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-ios-text-2">Integraciones</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBrandGoogle size={20} className="text-ios-text-2" />
              <span className="text-sm text-ios-text">Google Calendar</span>
            </div>
            {calConnected ? (
              <span className="text-sm font-medium text-ios-green">Conectado</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={initiateGoogleAuth}>
                Conectar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ios-sep pt-3">
            <div className="flex items-center gap-2">
              <IconMail size={20} className="text-ios-text-2" />
              <span className="text-sm text-ios-text">Correo (Resend)</span>
            </div>
            <Button size="sm" variant="secondary" loading={sendingTest} onClick={sendTestEmail}>
              Enviar prueba
            </Button>
          </div>
        </Card>

        <Button variant="destructive" size="lg" className="w-full" onClick={signOut}>
          <span className="flex items-center justify-center gap-2">
            <IconLogout size={18} /> Cerrar sesión
          </span>
        </Button>

        <div className="pb-4 pt-2 text-center text-[11px] leading-relaxed text-ios-text-3">
          <p>DUO OS · v0.1.0</p>
          <p>© {new Date().getFullYear()} DUO · Agencia de Marketing · Bolivia</p>
          <p>Desarrollado por Emanuel Baldiviezo</p>
        </div>
      </div>
    </div>
  );
}
