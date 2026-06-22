import { useCallback, useEffect, useState } from 'react';
import {
  IconCash,
  IconAlertTriangle,
  IconUsers,
  IconClock,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { calculateMRR, type MRRResult } from '@/lib/mrr';
import { greeting, formatCurrency } from '@/lib/utils';
import { TopBar } from '@/components/layout/TopBar';
import { MRRTracker } from '@/components/dashboard/MRRTracker';
import { KPIGrid, type KPIItem } from '@/components/dashboard/KPIGrid';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { Card } from '@/components/ui/Card';
import { TaskItem } from '@/components/tasks/TaskItem';
import { LoadingDots } from '@/components/ui/LoadingDots';
import type { AiInsight, Task } from '@/types/app.types';

export function Home() {
  const { user, profile } = useAuthStore();
  const [mrr, setMrr] = useState<MRRResult | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const nowISO = new Date().toISOString();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];

    const [mrrRes, todayRes, overdueRes, clientsRes, txRes, insightsRes] = await Promise.all([
      calculateMRR(user.id),
      supabase
        .from('tasks')
        .select('*, client:clients(name)')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .lte('due_date', endOfDay.toISOString())
        .order('priority'),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'done')
        .lt('due_date', nowISO),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['active', 'at_risk']),
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

    setMrr(mrrRes);
    setTodayTasks((todayRes.data as Task[]) ?? []);
    setOverdueCount(overdueRes.count ?? 0);
    setClientsCount(clientsRes.count ?? 0);
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
      .update({
        status: done ? 'pending' : 'done',
        completed_at: done ? null : new Date().toISOString(),
      })
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

  if (loading || !mrr) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingDots />
      </div>
    );
  }

  const kpis: KPIItem[] = [
    { label: 'Ingresos/mes', value: formatCurrency(mrr.current), icon: IconCash, tone: 'green' },
    { label: 'Vencidas', value: String(overdueCount), icon: IconAlertTriangle, tone: 'red' },
    { label: 'Clientes', value: String(clientsCount), icon: IconUsers },
    { label: 'Por cobrar', value: formatCurrency(pending), icon: IconClock, tone: 'orange' },
  ];

  return (
    <div className="space-y-5">
      <TopBar title={profile?.user_name ?? 'Inicio'} subtitle={greeting()} />

      <div className="space-y-5 px-5">
        <MRRTracker mrr={mrr} />
        <KPIGrid items={kpis} />

        {insights.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ios-text-2">Alertas IA</h2>
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} onAck={ackInsight} />
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ios-text-2">Hoy</h2>
          {todayTasks.length === 0 ? (
            <Card>
              <p className="text-sm text-ios-text-3">Nada urgente para hoy. ¡Buen trabajo!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
