import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconPlus, IconMicrophone, IconChecklist } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isOverdue, cn } from '@/lib/utils';
import { TopBar } from '@/components/layout/TopBar';
import { TaskItem } from '@/components/tasks/TaskItem';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { VoiceCapture } from '@/components/tasks/VoiceCapture';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingDots } from '@/components/ui/LoadingDots';
import type { Task } from '@/types/app.types';

type Filter = 'overdue' | 'today' | 'week' | 'done';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'overdue', label: 'Vencidas' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'done', label: 'Hechas' },
];

export function Tasks() {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('today');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*, client:clients(name)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false });
    setTasks((data as Task[]) ?? []);
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

  const filtered = useMemo(() => {
    const now = Date.now();
    const weekEnd = now + 7 * 86400000;
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return tasks.filter((t) => {
      if (filter === 'done') return t.status === 'done';
      if (t.status === 'done') return false;
      if (filter === 'overdue') return isOverdue(t.due_date);
      if (filter === 'today')
        return t.due_date ? new Date(t.due_date).getTime() <= endOfDay.getTime() : false;
      if (filter === 'week')
        return t.due_date ? new Date(t.due_date).getTime() <= weekEnd : true;
      return true;
    });
  }, [tasks, filter]);

  return (
    <div>
      <TopBar
        title="Tareas"
        right={
          <div className="flex gap-2">
            <button
              onClick={() => setShowVoice(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-l text-brand"
            >
              <IconMicrophone size={20} />
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setShowNew(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white"
            >
              <IconPlus size={20} />
            </button>
          </div>
        }
      />

      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-5">
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

      <div className="mt-4 px-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingDots />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={IconChecklist} title="Sin tareas aquí" description="Crea una nueva o dicta por voz." />
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onEdit={(task) => {
                  setEditing(task);
                  setShowNew(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <NewTaskModal
        open={showNew}
        onClose={() => {
          setShowNew(false);
          setEditing(null);
        }}
        onCreated={load}
        task={editing}
      />
      <VoiceCapture open={showVoice} onClose={() => setShowVoice(false)} onCreated={load} />
    </div>
  );
}
