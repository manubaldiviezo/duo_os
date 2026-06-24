import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBrandGoogle,
  IconLogout,
  IconMail,
  IconCalendarTime,
  IconUpload,
  IconCrown,
  IconChevronRight,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { PLANS, type Plan } from '@/lib/plans';
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
import { applyBrandColor, FONT_STACKS, cn } from '@/lib/utils';

const BRAND_COLORS = ['#F2741B', '#FF2D55', '#34C759', '#007AFF', '#AF52DE', '#FF3B30', '#5856D6', '#FFCC00'];
const FONTS = [
  { key: 'system', label: 'Sistema' },
  { key: 'inter', label: 'Inter' },
  { key: 'poppins', label: 'Poppins' },
  { key: 'montserrat', label: 'Montserrat' },
];

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
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const currentPlan = (profile?.plan ?? 'free') as Plan;
  const [agencyName, setAgencyName] = useState(profile?.agency_name ?? '');
  const [mrrGoal, setMrrGoal] = useState(String(profile?.mrr_goal ?? 3000));
  const [aiFeatures, setAiFeatures] = useState<AIFeatures>({});
  const [calConnected, setCalConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
      subject: 'Prueba de correo — DUO Community',
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
  }

  async function changeSecondary(hex: string) {
    if (!user) return;
    document.documentElement.style.setProperty('--brand-2', hex);
    if (profile) setProfile({ ...profile, brand_color_secondary: hex });
    await supabase.from('profiles').update({ brand_color_secondary: hex }).eq('id', user.id);
  }

  async function changeFont(key: string) {
    if (!user) return;
    document.documentElement.style.setProperty('--font-sans', FONT_STACKS[key] ?? FONT_STACKS.system);
    if (profile) setProfile({ ...profile, font_family: key });
    await supabase.from('profiles').update({ font_family: key }).eq('id', user.id);
  }

  async function uploadLogo(file: File) {
    if (!user) return;
    setUploadingLogo(true);
    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
    const path = `${user.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingLogo(false);
      toast('No se pudo subir. ¿Creaste el bucket público "logos" en Supabase?', 'error');
      return;
    }
    const { data } = supabase.storage.from('logos').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ logo_url: url }).eq('id', user.id);
    if (profile) setProfile({ ...profile, logo_url: url });
    setUploadingLogo(false);
    toast('Logo actualizado', 'success');
  }

  return (
    <div>
      <TopBar title="Perfil" subtitle={profile?.agency_name} />

      <div className="space-y-5 px-5 pt-2">
        <Card onClick={() => navigate('/planes')} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-l">
              <IconCrown size={20} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ios-text">Plan {PLANS[currentPlan].name}</p>
              <p className="text-xs text-ios-text-3">Ver planes y mejorar</p>
            </div>
          </div>
          <IconChevronRight size={20} className="text-ios-text-3" />
        </Card>

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
          <h2 className="text-sm font-semibold text-ios-text-2">Apariencia</h2>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-ios-bg">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-ios-text-3">Logo</span>
              )}
            </div>
            <div>
              <Button
                size="sm"
                variant="secondary"
                loading={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                <span className="flex items-center gap-1">
                  <IconUpload size={16} /> Subir logo
                </span>
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                }}
              />
            </div>
          </div>

          {/* Color primario */}
          <div>
            <p className="mb-2 text-xs font-medium text-ios-text-2">Color principal</p>
            <div className="flex flex-wrap gap-2.5">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => changeColor(c)}
                  className={cn(
                    'h-9 w-9 rounded-full transition-transform active:scale-90',
                    profile?.brand_color?.toLowerCase() === c.toLowerCase() && 'ring-2 ring-offset-2 ring-offset-ios-card'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-ios-text-3 text-xs text-ios-text-3">
                +
                <input type="color" className="sr-only" value={profile?.brand_color ?? '#F2741B'} onChange={(e) => changeColor(e.target.value)} />
              </label>
            </div>
          </div>

          {/* Color secundario (acento) */}
          <div>
            <p className="mb-2 text-xs font-medium text-ios-text-2">Color secundario (acento)</p>
            <div className="flex flex-wrap gap-2.5">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => changeSecondary(c)}
                  className={cn(
                    'h-9 w-9 rounded-full transition-transform active:scale-90',
                    profile?.brand_color_secondary?.toLowerCase() === c.toLowerCase() && 'ring-2 ring-offset-2 ring-offset-ios-card'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Acento ${c}`}
                />
              ))}
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-ios-text-3 text-xs text-ios-text-3">
                +
                <input type="color" className="sr-only" value={profile?.brand_color_secondary ?? '#FFB037'} onChange={(e) => changeSecondary(e.target.value)} />
              </label>
            </div>
          </div>

          {/* Tipografía */}
          <div>
            <p className="mb-2 text-xs font-medium text-ios-text-2">Tipografía</p>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => changeFont(f.key)}
                  style={{ fontFamily: FONT_STACKS[f.key] }}
                  className={cn(
                    'rounded-xl px-3 py-2.5 text-sm transition-colors',
                    (profile?.font_family ?? 'system') === f.key ? 'bg-brand text-white' : 'bg-ios-bg text-ios-text'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
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

        <Card className="space-y-1">
          <h2 className="mb-2 text-sm font-semibold text-ios-text-2">Integraciones</h2>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <IconBrandGoogle size={20} className="text-ios-text-2" />
              <div>
                <span className="block text-sm text-ios-text">Google Calendar</span>
                <span className="text-[11px] text-ios-text-3">Agenda y reuniones</span>
              </div>
            </div>
            {calConnected ? (
              <span className="text-sm font-medium text-ios-green">Conectado</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={initiateGoogleAuth}>
                Conectar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ios-sep py-2">
            <div className="flex items-center gap-2">
              <IconCalendarTime size={20} className="text-ios-text-2" />
              <div>
                <span className="block text-sm text-ios-text">Calendly</span>
                <span className="text-[11px] text-ios-text-3">Reservas de reuniones</span>
              </div>
            </div>
            <span className="rounded-full bg-ios-text-3/15 px-2.5 py-0.5 text-[11px] font-medium text-ios-text-3">
              Próximamente
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-ios-sep py-2">
            <div className="flex items-center gap-2">
              <IconMail size={20} className="text-ios-text-2" />
              <div>
                <span className="block text-sm text-ios-text">Correo (Resend)</span>
                <span className="text-[11px] text-ios-text-3">Notificaciones por email</span>
              </div>
            </div>
            <Button size="sm" variant="secondary" loading={sendingTest} onClick={sendTestEmail}>
              Probar
            </Button>
          </div>
        </Card>

        <Button variant="destructive" size="lg" className="w-full" onClick={signOut}>
          <span className="flex items-center justify-center gap-2">
            <IconLogout size={18} /> Cerrar sesión
          </span>
        </Button>

        <div className="pb-4 pt-2 text-center text-[11px] leading-relaxed text-ios-text-3">
          <p>DUO Community · v0.1.0</p>
          <p>© {new Date().getFullYear()} DUO · Agencia de Marketing · Bolivia</p>
          <p>Desarrollado por Emanuel Baldiviezo</p>
        </div>
      </div>
    </div>
  );
}
