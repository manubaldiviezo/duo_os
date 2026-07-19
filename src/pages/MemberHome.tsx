import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconFlame, IconLogout, IconBellRinging } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { signOut } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { isOverdue, formatTaskWhen, greeting, cn } from '@/lib/utils';
import { celebrate, taskXPEarned, xpForTask, xpForNextLevel, completedOnTime } from '@/lib/game';
import { currentSubscription, enablePush } from '@/lib/push';
import type { Task } from '@/types/app.types';

/* Vista del MIEMBRO del equipo (Valeria y compañía):
   sus retos, su XP y su racha. Sin finanzas, sin configuración, sin ruido. */
export function MemberHome() {
  const { user, profile } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agency, setAgency] = useState('');
  const [loading, setLoading] = useState(true);
  const [pushOn, setPushOn] = useState(true); // asumimos activo hasta chequear

  const load = useCallback(async () => {
    if (!user || !profile?.linked_owner_id || !profile.member_id) return;
    const [tasksRes, ownerRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, client:clients(name)')
        .eq('user_id', profile.linked_owner_id)
        .eq('assigned_member_id', profile.member_id)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('profiles').select('agency_name').eq('id', profile.linked_owner_id).single(),
    ]);
    setTasks((tasksRes.data as Task[]) ?? []);
    setAgency(ownerRes.data?.agency_name ?? 'tu equipo');
    setLoading(false);
  }, [user, profile?.linked_owner_id, profile?.member_id]);

  useEffect(() => {
    load();
    void currentSubscription().then((s) => setPushOn(Boolean(s)));
  }, [load]);

  async function markDone(task: Task) {
    await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id);
    celebrate({ xp: xpForTask(task) + 15, message: '¡Reto cumplido!' });
    load();
  }

  async function activatePush() {
    if (!user) return;
    const res = await enablePush(user.id);
    if (res.ok) {
      setPushOn(true);
      toast('¡Listo! Te avisaremos de tus nuevos retos', 'success');
    } else {
      toast(res.error ?? 'No se pudo activar', 'error');
    }
  }

  /* -------- juego personal -------- */
  const done = tasks.filter((t) => t.status === 'done' && t.completed_at);
  const xpTotal = done.reduce((s, t) => s + taskXPEarned(t), 0);
  const lvl = xpForNextLevel(xpTotal);
  const streak = useMemo(() => {
    const days = new Set(done.map((t) => new Date(t.completed_at as string).toDateString()));
    let n = 0;
    const c = new Date();
    if (!days.has(c.toDateString())) c.setDate(c.getDate() - 1);
    while (days.has(c.toDateString())) {
      n++;
      c.setDate(c.getDate() - 1);
    }
    return n;
  }, [done]);

  const pending = tasks.filter((t) => t.status !== 'done');
  const doneToday = done.filter(
    (t) => new Date(t.completed_at as string).toDateString() === new Date().toDateString()
  );
  const onTimeMonth = done.filter(
    (t) =>
      completedOnTime(t) &&
      new Date(t.completed_at as string).getMonth() === new Date().getMonth()
  ).length;

  return (
    <div className="mx-auto min-h-screen max-w-lg space-y-4 px-5 pb-10 pt-[calc(env(safe-area-inset-top)+16px)]">
      {/* hero */}
      <div
        className="rounded-3xl p-4 text-white shadow-lg"
        style={{
          background: 'linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 62%, #ffb02e))',
        }}
      >
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="DUO" className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold leading-tight">
              {greeting()}, {profile?.user_name?.split(' ')[0] ?? '👋'}
            </p>
            <p className="truncate text-xs font-bold opacity-85">Equipo de {agency}</p>
          </div>
          <button
            onClick={signOut}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
            aria-label="Cerrar sesión"
          >
            <IconLogout size={17} />
          </button>
        </div>
        <div className="mt-3.5 flex gap-2">
          {[
            { v: `Nv ${lvl.level}`, l: `${xpTotal} XP` },
            { v: String(pending.length), l: 'retos hoy' },
            { v: String(doneToday.length), l: 'cumplidos' },
            { v: `🔥 ${streak}`, l: 'racha' },
          ].map((s) => (
            <div key={s.l} className="flex-1 rounded-2xl bg-white/15 px-1 py-2 text-center">
              <p className="text-base font-extrabold leading-tight">{s.v}</p>
              <p className="text-[10px] font-bold opacity-85">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* progreso hacia el siguiente nivel + meta */}
      <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-extrabold text-ios-text-2">Nivel {lvl.level}</p>
          <p className="text-xs font-bold text-ios-text-3">
            {lvl.needed - lvl.into} XP para nivel {lvl.level + 1}
          </p>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ios-bg">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.round((lvl.into / lvl.needed) * 100))}%`,
              background: 'linear-gradient(90deg, var(--gold), #ffc933)',
            }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-ios-text-3">
          {onTimeMonth} entregas a tiempo este mes · cada una suma para el equipo 🤝
        </p>
      </Card>

      {/* push */}
      {!pushOn && (
        <Card className="flex items-center gap-3" style={{ background: 'var(--gold-l)', borderColor: '#f3dfa4' }}>
          <IconBellRinging size={22} style={{ color: 'var(--gold-d)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ios-text">Activá tus avisos</p>
            <p className="text-xs font-semibold text-ios-text-2">Enterate al instante de nuevos retos</p>
          </div>
          <Button size="sm" onClick={activatePush}>
            Activar
          </Button>
        </Card>
      )}

      {/* retos */}
      <p className="px-1 text-[11px] font-extrabold tracking-widest text-ios-text-3">
        MIS RETOS · {pending.length} PENDIENTE{pending.length === 1 ? '' : 'S'}
      </p>
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingDots />
        </div>
      ) : pending.length === 0 ? (
        <Card className="py-6 text-center">
          <p className="text-3xl">🎉</p>
          <p className="text-base font-extrabold text-ios-text">¡Todo cumplido!</p>
          <p className="text-xs font-semibold text-ios-text-3">
            Cuando te asignen un nuevo reto te llegará un aviso
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pending.map((t) => {
            const overdue = isOverdue(t.due_date);
            return (
              <Card key={t.id} className="flex items-center gap-3">
                <span
                  className="w-1 self-stretch rounded-full"
                  style={{ background: overdue ? 'var(--bad)' : 'var(--brand)' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ios-text">{t.title}</p>
                  <p className={cn('truncate text-xs font-semibold', overdue ? 'text-ios-red' : 'text-ios-text-2')}>
                    {t.client?.name ? `${t.client.name} · ` : ''}
                    {t.due_date ? formatTaskWhen(t.due_date, t.due_end) : 'sin fecha'} ·{' '}
                    <span style={{ color: 'var(--gold-d)' }}>+{xpForTask(t)} XP</span>
                  </p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-ios-text-3">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => markDone(t)}
                  className="shrink-0 rounded-xl px-3.5 py-2 font-mono text-[11px] font-extrabold tracking-wider text-white"
                  style={{ background: 'var(--ok)', boxShadow: '0 3px 0 var(--ok-d)' }}
                >
                  LISTO
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* cumplidos hoy */}
      {doneToday.length > 0 && (
        <>
          <p className="px-1 text-[11px] font-extrabold tracking-widest text-ios-text-3">CUMPLIDOS HOY</p>
          <Card className="space-y-2">
            {doneToday.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="text-sm">✅</span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ios-text-3 line-through">
                  {t.title}
                </p>
                <span className="text-xs font-extrabold" style={{ color: 'var(--gold-d)' }}>
                  +{taskXPEarned(t)} XP
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      <p className="flex items-center justify-center gap-1 pt-2 text-center text-xs font-bold text-ios-text-3">
        <IconFlame size={14} style={{ color: 'var(--gold-d)' }} />
        Mantené tu racha: un reto cumplido por día
      </p>
    </div>
  );
}
