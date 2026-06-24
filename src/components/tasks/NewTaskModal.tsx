import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { sendEmail, emailTemplate } from '@/lib/email';
import type { Client, Task, TaskCategory, TaskPriority, TeamMember } from '@/types/app.types';

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
  task?: Task | null;
}

export function NewTaskModal({ open, onClose, onCreated, defaultClientId, task }: NewTaskModalProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const isEdit = Boolean(task);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from('clients').select('*').eq('user_id', user.id).then(({ data }) => setClients((data as Client[]) ?? []));
    supabase.from('team_members').select('*').eq('user_id', user.id).then(({ data }) => setMembers((data as TeamMember[]) ?? []));

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setClientId(task.client_id ?? '');
      setMemberId(task.assigned_member_id ?? '');
      setCategory(task.category);
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '');
    } else {
      setTitle('');
      setDescription('');
      setClientId(defaultClientId ?? '');
      setMemberId('');
      setCategory('other');
      setPriority('medium');
      setDueDate('');
    }
  }, [open, user, defaultClientId, task]);

  async function save() {
    if (!user || !title.trim()) {
      toast('Escribe un título', 'error');
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      client_id: clientId || null,
      category,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };
    if (memberId) payload.assigned_member_id = memberId;

    let error;
    if (isEdit && task) {
      ({ error } = await supabase.from('tasks').update(payload).eq('id', task.id));
    } else {
      payload.user_id = user.id;
      payload.created_via = 'manual';
      ({ error } = await supabase.from('tasks').insert(payload));
    }
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }

    // Notificar por email si se asignó/ cambió el responsable y tiene correo.
    const member = members.find((m) => m.id === memberId);
    const assignmentChanged = !isEdit || (task && task.assigned_member_id !== memberId);
    if (member?.email && memberId && assignmentChanged) {
      const res = await sendEmail({
        to: member.email,
        subject: `Tarea asignada: ${title.trim()}`,
        html: emailTemplate({
          title: 'Tienes una tarea asignada',
          body: `<b>${title.trim()}</b><br/>${dueDate ? `Para el ${dueDate}.<br/>` : ''}${description.trim() || ''}`,
          footer: 'Asignada desde DUO OS',
        }),
      });
      toast(
        res.success ? `Guardado y ${member.name} notificado` : 'Guardado (no se pudo enviar el email)',
        res.success ? 'success' : 'info'
      );
    } else {
      toast(isEdit ? 'Tarea actualizada' : 'Tarea creada', 'success');
    }
    onCreated();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'}>
      <div className="space-y-3">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" />
        <Textarea label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

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

        {members.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Responsable</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input label="Fecha límite" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

        <Button size="lg" className="w-full" loading={loading} onClick={save}>
          {isEdit ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
      </div>
    </BottomSheet>
  );
}
