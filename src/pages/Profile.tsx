import { useEffect, useState } from 'react';
import { IconBrandGoogle, IconLogout } from '@tabler/icons-react';
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
        </Card>

        <Button variant="destructive" size="lg" className="w-full" onClick={signOut}>
          <span className="flex items-center justify-center gap-2">
            <IconLogout size={18} /> Cerrar sesión
          </span>
        </Button>

        <p className="pb-4 text-center text-xs text-ios-text-3">DUO OS · v0.1.0</p>
      </div>
    </div>
  );
}
