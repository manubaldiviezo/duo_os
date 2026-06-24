// Edge Function: recordatorio de tarea (cron, ej. cada hora).
// Busca tareas que vencen pronto con responsable asignado y le envía un email.
// Marca reminder_sent para no reenviar.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmailServer, emailTemplate } from '../_shared/email.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date().toISOString();
  const horizon = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // próximas 24h

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, assigned_member_id, member:team_members(name, email)')
    .neq('status', 'done')
    .eq('reminder_sent', false)
    .not('assigned_member_id', 'is', null)
    .gte('due_date', now)
    .lte('due_date', horizon);

  let count = 0;
  for (const t of tasks ?? []) {
    const member = (t as any).member;
    if (member?.email) {
      const res = await sendEmailServer(
        member.email,
        `Recordatorio: ${t.title}`,
        emailTemplate({
          title: 'Una tarea vence pronto',
          body: `<b>${t.title}</b><br/>Vence: ${new Date(t.due_date).toLocaleString('es-BO')}.`,
          footer: 'Recordatorio automático de DUO OS',
        })
      );
      if (res.ok) {
        await supabase.from('tasks').update({ reminder_sent: true }).eq('id', t.id);
        count++;
      }
    }
  }

  return new Response(`Task reminders sent: ${count}`, { status: 200 });
});
