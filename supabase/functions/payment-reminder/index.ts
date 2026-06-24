// Edge Function: recordatorio de pago (cron diario).
// Busca cobros pendientes (pending_income) próximos a vencer o vencidos,
// crea un insight y envía un email al dueño de la agencia.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmailServer, emailTemplate } from '../_shared/email.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const soon = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const { data: pendings } = await supabase
    .from('transactions')
    .select('id, user_id, amount, description, date, client:clients(name)')
    .eq('type', 'pending_income')
    .lte('date', soon);

  let count = 0;
  for (const p of pendings ?? []) {
    const clientName = (p as any).client?.name ?? 'un cliente';

    // Insight dentro de la app
    await supabase.from('ai_insights').insert({
      user_id: p.user_id,
      type: 'mrr_alert',
      title: `Cobro pendiente: ${clientName}`,
      description: `Tienes un cobro de $${p.amount} (${p.description}) por gestionar.`,
      severity: 'warning',
      expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    });

    // Email al dueño
    const { data: userInfo } = await supabase.auth.admin.getUserById(p.user_id);
    const email = userInfo?.user?.email;
    if (email) {
      await sendEmailServer(
        email,
        `Cobro pendiente: ${clientName}`,
        emailTemplate({
          title: `Recordatorio de cobro — ${clientName}`,
          body: `Tienes un cobro pendiente de <b>$${p.amount}</b> (${p.description}). Conviene gestionarlo pronto.`,
          footer: 'Recordatorio automático de DUO OS',
        })
      );
      count++;
    }
  }

  return new Response(`Payment reminders processed: ${count}`, { status: 200 });
});
