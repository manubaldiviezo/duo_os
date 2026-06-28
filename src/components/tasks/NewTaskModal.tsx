import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { sendEmail, emailTemplate, taskEmailBody } from '@/lib/email';
import { toLocalDateInput, toLocalTimeInput, localDateTimeToISO, hasTime } from '@/lib/utils';
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

const selectClass =
  'w-full rounded-xl bg-ios-bg px-4 py-3 text-base text-ios-text outline-none focus:ring-2 focus:ring-brand/40';

export function NewTaskModal({ open, onClose, onCreated, defaultClientId, task }: NewTaskModalProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notifyAssignee, setNotifyAssignee] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setClients((data as Client[]) ?? []));

    supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setMembers((data as TeamMember[]) ?? []));

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setClientId(task.client_id ?? '');
      setMemberId(task.assigned_member_id ?? '');
      setCategory(task.category);
      setPriority(task.priority);
      setDueDate(task.due_date ? toLocalDateInput(task.due_date) : '');
      setStartTime(task.due_date && hasTime(task.due_date) ? toLocalTimeInput(task.due_date) : '');
      setEndTime(task.due_end ? toLocalTimeInput(task.due_end) : '');
      setNotifyAssignee(true);
    } else {
      setTitle('');
      setDescription('');
      setClientId(defaultClientId ?? '');
      setMemberId('');
      setCategory('other');
      setPriority('medium');
      setDueDate('');
      setStartTime('');
      setEndTime('');
      setNotifyAssignee(true);
    }
  }, [open, user, defaultClientId, task]);

  async function save() {
    if (!user || !title.trim()) {
      toast('Escribe un título', 'error');
      return;
    }

    setLoading(true);

    const newDue = dueDate ? localDateTimeToISO(dueDate, startTime) : null;
    const newEnd = dueDate && endTime ? localDateTimeToISO(dueDate, endTime) : null;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      client_id: clientId || null,
      assigned_member_id: memberId || null,
      category,
      priority,
      // Fecha + hora opcional como hora LOCAL (sin desfase de zona horaria).
      due_date: newDue,
    };
    // Solo se envía due_end si hay hora fin (la columna requiere la migración 007).
    if (newEnd) payload.due_end = newEnd;

    let error;

    if (isEdit && task) {
      ({ error } = await supabase.from('tasks').update(payload).eq('id', task.id).eq('user_id', user.id));
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

    const member = members.find((m) => m.id === memberId);

    // ¿Cambió el responsable o la fecha/hora respecto a la tarea original?
    const sameTime = (a?: string | null, b?: string | null) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return new Date(a).getTime() === new Date(b).getTime();
    };
    const assigneeChanged = !isEdit || task?.assigned_member_id !== memberId;
    const dateChanged =
      isEdit && (!sameTime(newDue, task?.due_date ?? null) || !sameTime(newEnd, task?.due_end ?? null));

    // En edición, el interruptor manda; al crear, siempre se notifica si hay correo.
    const wantNotify = isEdit ? notifyAssignee : true;
    const shouldNotify = Boolean(member?.email && memberId && wantNotify);

    if (shouldNotify && member) {
      // Tipo de aviso según qué cambió.
      const kind: 'new' | 'rescheduled' | 'update' = assigneeChanged
        ? 'new'
        : dateChanged
          ? 'rescheduled'
          : 'update';
      const subject =
        kind === 'new'
          ? `Tarea asignada: ${title.trim()}`
          : kind === 'rescheduled'
            ? `Tarea reprogramada: ${title.trim()}`
            : `Tarea actualizada: ${title.trim()}`;
      const headerTitle =
        kind === 'new'
          ? 'Tienes una tarea asignada'
          : kind === 'rescheduled'
            ? 'Tu tarea fue reprogramada'
            : 'Se actualizó tu tarea';
      const cuando = dueDate ? `${dueDate}${startTime ? ` ${startTime}` : ''}` : '';

      const res = await sendEmail({
        to: member.email!,
        replyTo: user.email ?? undefined,
        fromName: profile?.agency_name ?? undefined,
        subject,
        html: emailTemplate({
          title: headerTitle,
          body: taskEmailBody({
            taskTitle: title.trim(),
            when: cuando || null,
            description: description.trim() || null,
            kind,
          }),
          footer: 'Enviado desde DUO Community',
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
      <div className="space-y-3 pb-24">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" />

        <Textarea label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
            <option value="">Sin cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className={selectClass}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Prioridad</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectClass}>
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
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={selectClass}>
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input label="Fecha (opcional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

        {dueDate && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hora inicio (opcional)"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="Hora fin (opcional)"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        )}

        {isEdit && memberId && members.find((m) => m.id === memberId)?.email && (
          <div className="rounded-xl bg-ios-bg px-4 py-1">
            <Toggle
              checked={notifyAssignee}
              onChange={setNotifyAssignee}
              label="Volver a notificar al responsable"
              description="Le reenvía el correo al guardar (nueva, reprogramada o actualizada según el cambio)."
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 bg-ios-card pb-1 pt-3">
        <Button size="lg" className="w-full" loading={loading} onClick={save}>
          {isEdit ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
      </div>
    </BottomSheet>
  );
}
