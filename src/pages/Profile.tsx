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
  IconBellRinging,
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
import { applyBrandColor, FONT_STACKS, resizeImageToDataUrl, cn } from '@/lib/utils';
import { currentSubscription, disablePush, enablePush, sendTestPush } from '@/lib/push';

// Temas curados: Naranja DUO, Océano, Bosque, Uva, Coral (+ selector libre).
const BRAND_COLORS = ['#F2741B', '#1CB0F6', '#2FB344', '#9D5CF0', '#FF6B6B'];
const FONTS = [
  { key: 'system', label: 'Sistema' },
  { key: 'inter', label: 'Inter' },
  { key: 'poppins', label: 'Poppins' },
  { key: 'montserrat', label: 'Montserrat' },
];

type AIFeatures = Record<string, boolean>;

const AI_FEATURES: { key: string; label: string; desc: string }[] = [
  { key: 'voice_capture', label: 'Captura por voz', desc: 'Dictar tareas e ideas con el micrófono.' },
  { key: 'churn_detection', label: 'Alertas de clientes en riesgo', desc: 'Avisa si un cliente lleva mucho sin contacto o con pagos/tareas atrasados.' },
  { key: 'morning_briefing', label: 'Resumen matutino', desc: 'Un resumen de tu día cada mañana.' },
  { key: 'mrr_coaching', label: 'Coach de crecimiento', desc: 'Sugerencias de la IA para subir tus ingresos mensuales.' },
  { key: 'pattern_detection', label: 'Detección de patrones', desc: 'Identifica retrasos o riesgos que se repiten con tus clientes.' },
  { key: 'time_blocking', label: 'Organización del día', desc: 'La IA ordena tus tareas por prioridad cuando se lo pides.' },
];

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
  const [pushOn, setPushOn] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void currentSubscription().then((s) => setPushOn(Boolean(s)));
  }, []);

  async function togglePush(next: boolean) {
    if (!user) return;
    if (next) {
      const res = await enablePush(user.id);
      if (res.ok) {
        setPushOn(true);
        toast('Notificaciones activadas en este dispositivo', 'success');
      } else {
        toast(res.error ?? 'No se pudo activar', 'error');
      }
    } else {
      await disablePush();
      setPushOn(false);
      toast('Notificaciones desactivadas', 'info');
    }
  }

  async function testPush() {
    setPushTesting(true);
    const res = await sendTestPush();
    setPushTesting(false);
    if (res.ok) toast('Notificación enviada — mirala llegar 👀', 'success');
    else toast(res.error ?? 'No se pudo enviar', 'error');
  }

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

  async function changeFont(key: string) {
    if (!user) return;
    document.documentElement.style.setProperty('--font-sans', FONT_STACKS[key] ?? FONT_STACKS.system);
    if (profile) setProfile({ ...profile, font_family: key });
    await supabase.from('profiles').update({ font_family: key }).eq('id', user.id);
  }

  async function uploadLogo(file: File) {
    if (!user) return;
    setUploadingLogo(true);
    try {
      // Se reduce a 256px y se guarda como data URL en el perfil (sin Storage ni bucket).
      const dataUrl = await resizeImageToDataUrl(file, 256);
      const { error } = await supabase.from('profiles').update({ logo_url: dataUrl }).eq('id', user.id);
      if (error) {
        toast(error.message, 'error');
        return;
      }
      if (profile) setProfile({ ...profile, logo_url: dataUrl });
      toast('Logo actualizado', 'success');
    } catch {
      toast('No se pudo procesar la imagen', 'error');
    } finally {
      setUploadingLogo(false);
    }
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
          {AI_FEATURES.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ios-text">{f.label}</p>
                <p className="text-[11px] leading-snug text-ios-text-3">{f.desc}</p>
              </div>
              <Toggle checked={aiFeatures[f.key] ?? true} onChange={(v) => toggleAi(f.key, v)} />
            </div>
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

          <div className="flex items-center justify-between border-t border-ios-sep py-2">
            <div className="flex items-center gap-2">
              <IconBellRinging size={20} className="text-ios-text-2" />
              <div>
                <span className="block text-sm text-ios-text">Push en este dispositivo</span>
                <span className="text-[11px] text-ios-text-3">
                  {pushOn ? 'Activadas · te avisamos de tareas y recordatorios' : 'Avisos aunque la app esté cerrada'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pushOn && (
                <Button size="sm" variant="secondary" loading={pushTesting} onClick={testPush}>
                  Probar
                </Button>
              )}
              <Toggle checked={pushOn} onChange={togglePush} />
            </div>
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
