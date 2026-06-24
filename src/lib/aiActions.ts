import { supabase } from './supabase';
import { sendEmail, emailTemplate } from './email';
import type { TeamMember } from '@/types/app.types';

export interface AIAction {
  action: string;
  [key: string]: any;
}

const KNOWN_ACTIONS = [
  'create_tasks',
  'update_task',
  'create_client',
  'create_clients',
  'update_client',
  'add_transaction',
  'mark_payment_paid',
];

/** Intenta extraer una acción JSON del texto crudo de Gemini. Devuelve null si no es una acción. */
export function parseAction(raw: string): AIAction | null {
  const text = raw.trim();
  if (!text.startsWith('{')) return null;
  try {
    const cleaned = text.replace(/^```json\n?|\n?```$/g, '').trim();
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj.action === 'string' && KNOWN_ACTIONS.includes(obj.action)) {
      return obj as AIAction;
    }
  } catch {
    /* no es JSON válido */
  }
  return null;
}

/** Texto legible para la tarjeta de confirmación. */
export function describeAction(a: AIAction): { title: string; lines: string[] } {
  switch (a.action) {
    case 'create_tasks': {
      const tasks = Array.isArray(a.tasks) ? a.tasks : [];
      return {
        title: `Crear ${tasks.length} tarea(s)`,
        lines: tasks.map((t: any) => {
          const bits = [t.client_name, t.assigned_member_name, t.due_date, t.priority].filter(Boolean);
          return `• ${t.title}${bits.length ? ` (${bits.join(' · ')})` : ''}`;
        }),
      };
    }
    case 'update_task': {
      const changes = a.changes ?? {};
      return {
        title: 'Actualizar una tarea',
        lines: Object.entries(changes).map(([k, v]) => `• ${k}: ${v}`),
      };
    }
    case 'create_client': {
      const c = a.client ?? {};
      return {
        title: `Crear cliente: ${c.name ?? '—'}`,
        lines: [c.industry && `• Industria: ${c.industry}`, c.monthly_fee && `• Fee: $${c.monthly_fee}/mes`].filter(
          Boolean
        ) as string[],
      };
    }
    case 'create_clients': {
      const clients = Array.isArray(a.clients) ? a.clients : [];
      return {
        title: `Crear ${clients.length} cliente(s)`,
        lines: clients.map((c: any) => `• ${c.name}${c.monthly_fee ? ` ($${c.monthly_fee}/mes)` : ''}`),
      };
    }
    case 'update_client': {
      const changes = a.changes ?? {};
      return {
        title: 'Actualizar un cliente',
        lines: Object.entries(changes).map(([k, v]) => `• ${k}: ${v}`),
      };
    }
    case 'add_transaction': {
      const t = a.transaction ?? a;
      const tipo = t.type === 'expense' ? 'gasto' : t.type === 'pending_income' ? 'cobro pendiente' : 'ingreso';
      return {
        title: `Registrar ${tipo}`,
        lines: [t.description && `• ${t.description}`, t.amount && `• $${t.amount}`].filter(Boolean) as string[],
      };
    }
    case 'mark_payment_paid': {
      return {
        title: 'Marcar cobro como recibido',
        lines: [a.client_name && `• ${a.client_name}`].filter(Boolean) as string[],
      };
    }
    default:
      return { title: 'Acción', lines: [] };
  }
}

/** Ejecuta la acción contra Supabase. Devuelve un mensaje de resultado para el chat. */
export async function executeAction(
  a: AIAction,
  ctx: { userId: string; members: TeamMember[] }
): Promise<string> {
  switch (a.action) {
    case 'create_tasks': {
      const tasks = Array.isArray(a.tasks) ? a.tasks : [];
      const rows = tasks.map((t: any) => {
        const row: Record<string, unknown> = {
          user_id: ctx.userId,
          title: t.title,
          client_id: t.client_id ?? null,
          category: t.category ?? 'other',
          priority: t.priority ?? 'medium',
          due_date: t.due_date ? new Date(t.due_date).toISOString() : null,
          description: t.description ?? null,
          created_via: 'ai_suggestion',
        };
        if (t.assigned_member_id) row.assigned_member_id = t.assigned_member_id;
        return row;
      });
      const { error } = await supabase.from('tasks').insert(rows);
      if (error) return `No pude crear las tareas: ${error.message}`;

      // Delegación: notificar por email a los responsables asignados.
      let notified = 0;
      for (const t of tasks) {
        const member = ctx.members.find((m) => m.id === t.assigned_member_id);
        if (member?.email) {
          const res = await sendEmail({
            to: member.email,
            subject: `Nueva tarea asignada: ${t.title}`,
            html: emailTemplate({
              title: 'Tienes una nueva tarea',
              body: `<b>${t.title}</b><br/>${t.due_date ? `Para el ${t.due_date}.<br/>` : ''}${
                t.description ?? ''
              }`,
              footer: 'Asignada desde DUO OS',
            }),
          });
          if (res.success) notified++;
        }
      }
      return `Creé ${rows.length} tarea(s)${notified ? ` y notifiqué a ${notified} responsable(s) por correo` : ''}.`;
    }

    case 'update_task': {
      if (!a.task_id) return 'No identifiqué qué tarea actualizar.';
      const changes: Record<string, unknown> = { ...(a.changes ?? {}) };
      if (typeof changes.due_date === 'string') changes.due_date = new Date(changes.due_date).toISOString();
      if (changes.status === 'done') changes.completed_at = new Date().toISOString();
      const { error } = await supabase.from('tasks').update(changes).eq('id', a.task_id).eq('user_id', ctx.userId);
      if (error) return `No pude actualizar la tarea: ${error.message}`;
      return 'Tarea actualizada.';
    }

    case 'create_client': {
      const c = a.client ?? {};
      if (!c.name) return 'Falta el nombre del cliente.';
      const { error } = await supabase.from('clients').insert({
        user_id: ctx.userId,
        name: c.name,
        industry: c.industry ?? null,
        monthly_fee: Number(c.monthly_fee) || 0,
        status: c.status ?? 'active',
        contact_email: c.contact_email ?? null,
        whatsapp: c.whatsapp ?? null,
      });
      if (error) return `No pude crear el cliente: ${error.message}`;
      return `Cliente "${c.name}" creado.`;
    }

    case 'create_clients': {
      const clients = Array.isArray(a.clients) ? a.clients : [];
      const rows = clients
        .filter((c: any) => c?.name)
        .map((c: any) => ({
          user_id: ctx.userId,
          name: c.name,
          industry: c.industry ?? c.service_type ?? null,
          monthly_fee: Number(c.monthly_fee) || 0,
          status: c.status ?? 'active',
          services: Array.isArray(c.services) ? c.services : c.service_type ? [c.service_type] : [],
          contact_email: c.contact_email ?? null,
          whatsapp: c.whatsapp ?? null,
          notes: c.notes ?? null,
        }));
      if (rows.length === 0) return 'No recibí clientes válidos.';
      const { error } = await supabase.from('clients').insert(rows);
      if (error) return `No pude crear los clientes: ${error.message}`;
      return `Creé ${rows.length} cliente(s). Sus tareas del mes se generaron automáticamente.`;
    }

    case 'update_client': {
      if (!a.client_id) return 'No identifiqué qué cliente actualizar.';
      const changes: Record<string, unknown> = { ...(a.changes ?? {}) };
      if (changes.monthly_fee !== undefined) changes.monthly_fee = Number(changes.monthly_fee) || 0;
      const { error } = await supabase
        .from('clients')
        .update(changes)
        .eq('id', a.client_id)
        .eq('user_id', ctx.userId);
      if (error) return `No pude actualizar el cliente: ${error.message}`;
      return 'Cliente actualizado.';
    }

    case 'add_transaction': {
      const t = a.transaction ?? a;
      if (!t.amount || !t.description) return 'Falta el monto o la descripción.';
      let client_id = t.client_id ?? null;
      if (!client_id && t.client_name) {
        const { data } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', ctx.userId)
          .ilike('name', t.client_name)
          .limit(1)
          .maybeSingle();
        client_id = data?.id ?? null;
      }
      const { error } = await supabase.from('transactions').insert({
        user_id: ctx.userId,
        type: t.type ?? 'income',
        amount: Number(t.amount),
        description: t.description,
        client_id,
        date: t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });
      if (error) return `No pude registrar la transacción: ${error.message}`;
      return 'Transacción registrada en Finanzas.';
    }

    case 'mark_payment_paid': {
      let q = supabase
        .from('transactions')
        .update({ type: 'income', date: new Date().toISOString().split('T')[0] })
        .eq('user_id', ctx.userId)
        .eq('type', 'pending_income');
      if (a.transaction_id) q = q.eq('id', a.transaction_id);
      else if (a.client_id) q = q.eq('client_id', a.client_id);
      else return 'No identifiqué qué cobro marcar como recibido.';
      const { error } = await q;
      if (error) return `No pude actualizar el cobro: ${error.message}`;
      return 'Cobro marcado como recibido. ✅';
    }

    default:
      return 'No reconozco esa acción.';
  }
}
