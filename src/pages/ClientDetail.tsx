import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconChevronLeft, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { TaskItem } from '@/components/tasks/TaskItem';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { ClientForm } from '@/components/clients/ClientForm';
import type { Client, Task } from '@/types/app.types';

type Tab = 'summary' | 'tasks' | 'notes';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>('summary');
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    const [clientRes, tasksRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase
        .from('tasks')
        .select('*, client:clients(name)')
        .eq('client_id', id)
        .order('due_date', { ascending: true, nullsFirst: false }),
    ]);
    setClient((clientRes.data as Client) ?? null);
    setTasks((tasksRes.data as Task[]) ?? []);
    setLoading(false);
  }, [user, id]);

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

  async function deleteClient() {
    if (!client) return;
    await supabase.from('clients').delete().eq('id', client.id);
    toast('Cliente eliminado', 'success');
    navigate('/clientes');
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingDots />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="px-5 pt-20 text-center text-sm text-ios-text-3">Cliente no encontrado.</div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-ios-bg/80 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-ios">
        <button onClick={() => navigate(-1)} className="flex items-center text-brand">
          <IconChevronLeft size={24} />
          <span className="text-sm">Clientes</span>
        </button>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="text-brand">
            <IconEdit size={22} />
          </button>
          <button onClick={deleteClient} className="text-ios-red">
            <IconTrash size={22} />
          </button>
        </div>
      </header>

      <div className="space-y-5 px-5 pt-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar name={client.name} color={client.custom_color} size={72} />
          <h1 className="text-xl font-bold text-ios-text">{client.name}</h1>
          <p className="text-sm text-ios-text-3">{client.industry ?? 'Sin industria'}</p>
          <p className="text-2xl font-extrabold text-brand">{formatCurrency(client.monthly_fee)}/mes</p>
        </div>

        <div className="flex gap-2">
          {(['summary', 'tasks', 'notes'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                tab === t ? 'bg-brand text-white' : 'bg-ios-card text-ios-text-2'
              }`}
            >
              {t === 'summary' ? 'Resumen' : t === 'tasks' ? 'Tareas' : 'Notas'}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          <Card className="space-y-3">
            <Row label="Estado" value={<Pill color="green">{client.status}</Pill>} />
            <Row label="Email" value={client.contact_email ?? '—'} />
            <Row label="WhatsApp" value={client.whatsapp ?? '—'} />
            <Row label="Servicios" value={client.services?.join(', ') || '—'} />
            <Row label="Inicio" value={client.start_date ?? '—'} />
          </Card>
        )}

        {tab === 'tasks' && (
          <div className="space-y-2">
            <Button size="sm" variant="secondary" onClick={() => setShowNewTask(true)}>
              <span className="flex items-center gap-1">
                <IconPlus size={16} /> Nueva tarea
              </span>
            </Button>
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-ios-text-3">Sin tareas para este cliente.</p>
            ) : (
              tasks.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
              ))
            )}
          </div>
        )}

        {tab === 'notes' && (
          <Card>
            <p className="whitespace-pre-wrap text-sm text-ios-text-2">
              {client.notes || 'Sin notas. Edita el cliente para agregar.'}
            </p>
          </Card>
        )}
      </div>

      <ClientForm open={showEdit} onClose={() => setShowEdit(false)} onSaved={load} client={client} />
      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        onCreated={load}
        defaultClientId={client.id}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ios-text-3">{label}</span>
      <span className="text-sm font-medium text-ios-text">{value}</span>
    </div>
  );
}
