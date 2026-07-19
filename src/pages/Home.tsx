import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconEye,
  IconEyeOff,
  IconBulb,
  IconCalendarPlus,
  IconTrophy,
  IconBrandWhatsapp,
  IconVideo,
  IconChevronRight,
  IconFlame,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { greeting, isOverdue, formatTime, cn } from '@/lib/utils';
import { celebrate, xpForTask, computeStats } from '@/lib/game';
import { Card } from '@/components/ui/Card';
import { TaskItem } from '@/components/tasks/TaskItem';
import { LoadingDots } from '@/components/ui/LoadingDots';
import type { AgencyEvent, Task, TeamMember } from '@/types/app.types';

interface EventWithClient extends AgencyEvent {
  client?: { name: string; whatsapp?: string | null } | null;
}

/* "Hoy" — el panel del dueño (diseño 2.0 aprobado):
   hero con saludo y mini-stats → agenda → mis tareas → del equipo → dinero en una línea. */
export function Home() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [pendingMoney, setPendingMoney] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [mrrPct, setMrrPct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Privacidad: por defecto las finanzas van ocultas (seguro si hay gente cerca).
  const [showMoney, setShowMoney] = useState(() => localStorage.getItem('duo_show_money') === 'on');

  function toggleMoney() {
    setShowMoney((v) => {
      const next = !v;
      localStorage.setItem('duo_show_money', next ? 'on' : 'off');
      return next;
    });
  }

  const load = useCallback(async () => {
    if (!user) return;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];

    const [tasksRes, membersRes, eventsRes, txRes, profRes] = await Promise.all([
      supabase.from('tasks').select('*, client:clients(name)').eq('user_id', user.id),
      supabase.from('team_members').select('*').eq('user_id', user.id),
      supabase
        .from('events')
        .select('*, client:clients(name, whatsapp)')
        .eq('user_id', user.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .order('start_time'),
      supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'pending_income')
        .gte('date', monthStart),
      supabase.from('profiles').select('mrr_goal').eq('id', user.id).single(),
    ]);

    const allTasks = (tasksRes.data as Task[]) ?? [];
    setTasks(allTasks);
    setMembers((membersRes.data as TeamMember[]) ?? []);
    setEvents((eventsRes.data as EventWithClient[]) ?? []);

    const pend = (txRes.data ?? []).map((t) => Number(t.amount));
    setPendingMoney(pend.reduce((s, a) => s + a, 0));
    setPendingCount(pend.length);

    // % de la meta con los ingresos recurrentes activos (aproximación ligera).
    const goal = Number(profRes.data?.mrr_goal) || 0;
    if (goal > 0) {
      const { data: cl } = await supabase
        .from('clients')
        .select('monthly_fee')
        .eq('user_id', user.id)
        .eq('status', 'active');
      const mrr = (cl ?? []).reduce((s, c) => s + Number(c.monthly_fee), 0);
      setMrrPct(Math.min(100, Math.round((mrr / goal) * 100)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleTask(task: Task) {
    const done = task.status === 'done';
    await supabase
      .from('tasks')
      .update({ status: done ? 'pending' : 'done', completed_at: done ? null : new Date().toISOString() })
      .eq('id', task.id);
    if (!done) celebrate({ xp: xpForTask(task), message: '¡Hecha!' });
    load();
  }

  async function deleteTask(task: Task) {
    await supabase.from('tasks').delete().eq('id', task.id);
    load();
  }

  /* -------- derivados -------- */
  const stats = useMemo(
    () => computeStats(tasks, members, profile?.user_name ?? 'Tú'),
    [tasks, members, profile?.user_name]
  );
  const myStats = stats.find((s) => s.memberId === null);

  const dayEndTime = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  const myTasks = tasks.filter((t) => !t.assigned_member_id);
  const myPending = myTasks
    .filter(
      (t) =>
        t.status !== 'done' &&
        (isOverdue(t.due_date) || (t.due_date && new Date(t.due_date).getTime() <= dayEndTime) || !t.due_date)
    )
    .sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9'))
    .slice(0, 3);
  const myDoneToday = myTasks.filter(
    (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()
  ).length;

  const teamPending = tasks
    .filter((t) => t.assigned_member_id && t.status !== 'done')
    .sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9'))
    .slice(0, 3);

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? '—';
  const memberStreak = (id: string | null) => stats.find((s) => s.memberId === id)?.streakDays ?? 0;

  // Horas recuperadas esta semana: tareas delegadas completadas × su esfuerzo.
  const weekStart = Date.now() - 7 * 86400000;
  const delegatedDoneWeek = tasks.filter(
    (t) => t.assigned_member_id && t.status === 'done' && t.completed_at && new Date(t.completed_at).getTime() >= weekStart
  );
  const minutesSaved = delegatedDoneWeek.reduce(
    (s, t) => s + (t.priority === 'high' ? 60 : t.priority === 'low' ? 30 : 45),
    0
  );

  const fecha = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4 pb-8">
      {/* ---------- hero ---------- */}
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div
          className="rounded-3xl p-4 text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 62%, #ffb02e))',
          }}
        >
          <div className="flex items-center gap-3">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="h-11 w-11 shrink-0 rounded-xl bg-white/20 object-contain" />
            ) : (
              <img src="/icon-192.png" alt="DUO" className="h-11 w-11 shrink-0 rounded-xl" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-extrabold leading-tight">
                {greeting()}, {profile?.user_name ?? '👋'}
              </p>
              <p className="text-xs font-bold capitalize opacity-85">{fecha}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => navigate('/progreso')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
                aria-label="Progreso"
              >
                <IconTrophy size={18} />
              </button>
              <button
                onClick={() => navigate('/ideas')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
                aria-label="Ideas"
              >
                <IconBulb size={18} />
              </button>
              <button
                onClick={() => navigate('/perfil')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-sm font-extrabold"
                aria-label="Perfil"
              >
                {(profile?.user_name ?? 'U').slice(0, 1).toUpperCase()}
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex gap-2">
            {[
              { v: String(events.length), l: 'reuniones' },
              { v: String(myPending.length + teamPending.length), l: 'pendientes' },
              { v: String(myDoneToday), l: 'hechas hoy' },
              { v: `🔥 ${myStats?.streakDays ?? 0}`, l: 'racha' },
            ].map((s) => (
              <div key={s.l} className="flex-1 rounded-2xl bg-white/15 px-1 py-2 text-center backdrop-blur-sm">
                <p className="text-base font-extrabold leading-tight">{s.v}</p>
                <p className="text-[10px] font-bold opacity-85">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingDots />
        </div>
      ) : (
        <div className="space-y-4 px-5">
          {/* ---------- agenda ---------- */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-widest text-ios-text-3">
                AGENDA · HOY
              </p>
              <button
                onClick={() => navigate('/reuniones')}
                className="flex items-center gap-0.5 text-[11px] font-extrabold text-brand"
              >
                <IconCalendarPlus size={14} /> agendar
              </button>
            </div>
            {events.length === 0 ? (
              <Card className="py-3 text-center text-sm font-semibold text-ios-text-3">
                Sin reuniones hoy — día de producción 💪
              </Card>
            ) : (
              <Card className="space-y-3">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <span
                      className="shrink-0 rounded-xl px-2.5 py-2 text-xs font-extrabold tabular-nums"
                      style={{ background: 'var(--blue-l)', color: '#0e8dcb' }}
                    >
                      {formatTime(e.start_time)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ios-text">{e.title}</p>
                      {e.client?.name && (
                        <p className="truncate text-xs font-semibold text-ios-text-2">{e.client.name}</p>
                      )}
                    </div>
                    {e.client?.whatsapp && (
                      <a
                        href={`https://wa.me/${e.client.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: 'var(--ok-l)', color: 'var(--ok-d)' }}
                        aria-label="WhatsApp"
                      >
                        <IconBrandWhatsapp size={18} />
                      </a>
                    )}
                    {e.meet_link && (
                      <a
                        href={e.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-l text-brand-d"
                        aria-label="Meet"
                      >
                        <IconVideo size={18} />
                      </a>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* ---------- mis tareas ---------- */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-widest text-ios-text-3">
                MIS TAREAS · <span className="text-brand">{myDoneToday} HECHAS HOY</span>
              </p>
              <button
                onClick={() => navigate('/tareas')}
                className="flex items-center text-[11px] font-extrabold text-brand"
              >
                ver todas <IconChevronRight size={13} />
              </button>
            </div>
            {myPending.length === 0 ? (
              <Card className="py-4 text-center">
                <p className="text-2xl">🎉</p>
                <p className="text-sm font-bold text-ios-text">Todo al día</p>
                <p className="text-xs font-semibold text-ios-text-3">Dictale una tarea a DUO con el micrófono</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {myPending.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </div>
            )}
          </div>

          {/* ---------- del equipo ---------- */}
          {teamPending.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-extrabold tracking-widest text-ios-text-3">
                DEL EQUIPO · {teamPending.length} PENDIENTE{teamPending.length > 1 ? 'S' : ''}
              </p>
              <Card className="space-y-3">
                {teamPending.map((t) => {
                  const overdue = isOverdue(t.due_date);
                  const streak = memberStreak(t.assigned_member_id);
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <span
                        className="w-1 self-stretch rounded-full"
                        style={{ background: overdue ? 'var(--bad)' : 'var(--brand)' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ios-text">{t.title}</p>
                        <p className={cn('truncate text-xs font-semibold', overdue ? 'text-ios-red' : 'text-ios-text-2')}>
                          {memberName(t.assigned_member_id)}
                          {t.due_date &&
                            ` · ${overdue ? 'venció' : 'vence'} ${new Date(t.due_date).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}`}
                        </p>
                      </div>
                      {streak > 0 && (
                        <span
                          className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-extrabold"
                          style={{ background: 'var(--gold-l)', color: 'var(--gold-d)' }}
                        >
                          <IconFlame size={11} /> {streak}
                        </span>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* ---------- dinero en una línea ---------- */}
          <Card onClick={() => navigate('/finanzas')} className="py-3">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs font-extrabold" style={{ color: 'var(--gold-d)' }}>
                💰{' '}
                {showMoney
                  ? `${pendingCount} cobro${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'} · $${pendingMoney.toLocaleString('en-US')}${mrrPct !== null ? ` · MRR ${mrrPct}% de tu meta` : ''}`
                  : `${pendingCount} cobro${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'} · toca el ojo para ver montos`}
              </p>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggleMoney();
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ios-bg text-ios-text-2"
                aria-label={showMoney ? 'Ocultar montos' : 'Mostrar montos'}
              >
                {showMoney ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
              <IconChevronRight size={16} className="shrink-0 text-ios-text-3" />
            </div>
          </Card>

          {/* ---------- digest semanal ---------- */}
          {minutesSaved > 0 && (
            <p className="text-center text-xs font-extrabold" style={{ color: 'var(--gold-d)' }}>
              💪 El equipo cumplió {delegatedDoneWeek.length} reto{delegatedDoneWeek.length > 1 ? 's' : ''} esta semana y te
              devolvió {Math.floor(minutesSaved / 60)} h {minutesSaved % 60} min para hacer crecer la agencia
            </p>
          )}
        </div>
      )}
    </div>
  );
}
