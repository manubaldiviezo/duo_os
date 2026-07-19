import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCalendarEvent,
  IconAlertTriangle,
  IconUsers,
  IconChecklist,
  IconEye,
  IconEyeOff,
  IconBulb,
  IconCalendarPlus,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { calculateMRR, type MRRResult } from '@/lib/mrr';
import { greeting, isOverdue, cn } from '@/lib/utils';
import { TopBar } from '@/components/layout/TopBar';
import { MRRTracker } from '@/components/dashboard/MRRTracker';
import { KPIGrid, type KPIItem } from '@/components/dashboard/KPIGrid';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { Card } from '@/components/ui/Card';
import { TaskItem } from '@/components/tasks/TaskItem';
import { LoadingDots } from '@/components/ui/LoadingDots';
import type { AiInsight, Task } from '@/types/app.types';

type Filter = 'all' | 'urgent' | 'meetings';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Pendientes' },
  { value: 'urgent', label: 'Urgentes' },
  { value: 'meetings', label: 'Reuniones' },
];

export function Home() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [mrr, setMrr] = useState<MRRResult | null>(null);
  const [flowTasks, setFlowTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
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
    const now = new Date();
    const nowISO = now.toISOString();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];

    const [mrrRes, flowRes, clientsRes, eventsRes, txRes, insightsRes] = await Promise.all([
      calculateMRR(user.id),
      supabase
        .from('tasks')
        .select('*, client:clients(name)')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .lte('due_date', weekEnd)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['active', 'at_risk']),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('start_time', nowISO)
        .lte('start_time', weekEnd),
      supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .eq('type', 'pending_income')
        .gte('date', monthStart),
      supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const tasks = (flowRes.data as Task[]) ?? [];
    setMrr(mrrRes);
    setFlowTasks(tasks);
    setOverdueCount(tasks.filter((t) => isOverdue(t.due_date)).length);
    setTodayCount(
      tasks.filter((t) => t.due_date && new Date(t.due_date) <= endOfDay).length
    );
    setClientsCount(clientsRes.count ?? 0);
    setMeetingsCount(eventsRes.count ?? 0);
    setPending((txRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0));
    setInsights((insightsRes.data as AiInsight[]) ?? []);
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
    load();
  }

  async function deleteTask(task: Task) {
    await supabase.from('tasks').delete().eq('id', task.id);
    load();
  }

  async function ackInsight(id: string) {
    await supabase
      .from('ai_insights')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    setInsights((prev) => prev.filter((i) => i.id !== id));
  }

  const visibleTasks = useMemo(() => {
    if (filter === 'urgent') return flowTasks.filter((t) => isOverdue(t.due_date) || t.priority === 'high');
    if (filter === 'meetings') return flowTasks.filter((t) => t.category === 'meeting');
    return flowTasks;
  }, [flowTasks, filter]);

  if (loading || !mrr) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingDots />
      </div>
    );
  }

  const kpis: KPIItem[] = [
    { label: 'Hoy', value: String(todayCount), icon: IconChecklist },
    { label: 'Vencidas', value: String(overdueCount), icon: IconAlertTriangle, tone: 'red' },
    { label: 'Clientes', value: String(clientsCount), icon: IconUsers },
    { label: 'Reuniones', value: String(meetingsCount), icon: IconCalendarEvent, tone: 'orange' },
  ];

  return (
    <div className="space-y-5">
      <TopBar
        title={profile?.user_name ?? 'Inicio'}
        subtitle={greeting()}
        leading={
          profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt="Logo"
              className="h-10 w-10 shrink-0 rounded-xl object-contain"
            />
          ) : undefined
        }
        right={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/reuniones')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-card text-ios-text-2"
              aria-label="Reuniones"
            >
              <IconCalendarPlus size={20} />
            </button>
            <button
              onClick={() => navigate('/ideas')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-card text-ios-text-2"
              aria-label="Ideas"
            >
              <IconBulb size={20} />
            </button>
            <button
              onClick={toggleMoney}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-card text-ios-text-2"
              aria-label={showMoney ? 'Ocultar finanzas' : 'Mostrar finanzas'}
            >
              {showMoney ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
            <button
              onClick={() => navigate('/perfil')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-l text-sm font-extrabold text-brand-d"
              aria-label="Perfil"
            >
              {(profile?.user_name ?? 'U').slice(0, 1).toUpperCase()}
            </button>
          </div>
        }
      />

      <div className="space-y-5 px-5">
        {/* KPIs operativos (sin dinero) */}
        <KPIGrid items={kpis} />

        {/* Finanzas: solo si el usuario las revela */}
        {showMoney ? (
          <MRRTracker mrr={mrr} />
        ) : (
          <Card onClick={toggleMoney} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ios-text">Finanzas</p>
              <p className="text-xs text-ios-text-3">Tocá el ojo para mostrar montos</p>
            </div>
            <span className="text-lg font-bold tracking-widest text-ios-text-3">•••••</span>
          </Card>
        )}

        {insights.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ios-text-2">Alertas IA</h2>
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} onAck={ackInsight} />
            ))}
          </section>
        )}

        {/* Flujo de tareas con filtros */}
        <section>
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === f.value ? 'bg-brand text-white' : 'bg-ios-card text-ios-text-2'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visibleTasks.length === 0 ? (
            <Card>
              <p className="text-sm text-ios-text-3">Nada por aquí. ¡Buen trabajo! 🎉</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
