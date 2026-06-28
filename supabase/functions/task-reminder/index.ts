// Edge Function: recordatorio de tarea (cron, ej. cada 15 min).
// Envía un recordatorio ~2h antes de la entrega a su responsable.
// Marca reminder_sent para no reenviar. Responde-a (reply_to) = correo de la agencia.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmailServer, emailTemplate, taskEmailBody } from '../_shared/email.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  // Ventana: tareas que vencen dentro de las próximas ~2h (con holgura para el cron).
  const horizon = new Date(now + 2 * 3600 * 1000 + 15 * 60 * 1000).toISOString();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, due_end, user_id, assigned_member_id, member:team_members(name, email)')
    .neq('status', 'done')
    .eq('reminder_sent', false)
    .not('assigned_member_id', 'is', null)
    .gte('due_date', nowISO)
    .lte('due_date', horizon);

  // Cache del correo de la agencia (dueño) por user_id, para el reply_to.
  const ownerEmailCache = new Map<string, string | undefined>();
  const ownerEmail = async (userId: string): Promise<string | undefined> => {
    if (ownerEmailCache.has(userId)) return ownerEmailCache.get(userId);
    const { data } = await supabase.auth.admin.getUserById(userId);
    const email = data?.user?.email ?? undefined;
    ownerEmailCache.set(userId, email);
    return email;
  };

  let count = 0;
  for (const t of tasks ?? []) {
    const member = (t as any).member;
    if (!member?.email) continue;

    const due = new Date(t.due_date);
    const when = due.toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const res = await sendEmailServer(
      member.email,
      `Recordatorio: ${t.title}`,
      emailTemplate({
        title: 'Una tarea vence pronto',
        body: taskEmailBody({
          taskTitle: t.title,
          when,
          description: t.description,
          kind: 'reminder',
        }),
        footer: 'Recordatorio automático de DUO Community',
      }),
      await ownerEmail(t.user_id)
    );

    if (res.ok) {
      await supabase.from('tasks').update({ reminder_sent: true }).eq('id', t.id);
      count++;
    }
  }

  return new Response(`Task reminders sent: ${count}`, { status: 200 });
});
