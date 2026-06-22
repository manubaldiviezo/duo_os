import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { Client, TaskCategory, TaskPriority } from '@/types/app.types';

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'strategy', label: 'Estrategia' },
  { value: 'content', label: 'Contenido' },
  { value: 'ads', label: 'Ads' },
  { value: 'reports', label: 'Reportes' },
  { value: 'design', label: 'Diseño' },
  { value: 'meeting', label: 'Reunión' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Otro' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultClientId?: string;
}

export function NewTaskModal({ open, onClose, onCreated, defaultClientId }: NewTaskModalProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setClients((data as Client[]) ?? []));
    setClientId(defaultClientId ?? '');
  }, [open, user, defaultClientId]);

  async function save() {
    if (!user || !title.trim()) {
      toast('Escribe un título', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      client_id: clientId || null,
      category,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      created_via: 'manual',
    });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Tarea creada', 'success');
    setTitle('');
    setDescription('');
    setDueDate('');
    onCreated();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva tarea">
      <div className="space-y-3">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué hay que hacer?"
        />
        <Textarea
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
          >
            <option value="">Sin cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Prioridad</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Fecha límite"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <Button size="lg" className="w-full" loading={loading} onClick={save}>
          Crear tarea
        </Button>
      </div>
    </BottomSheet>
  );
}
