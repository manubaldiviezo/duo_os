// Edge Function: detector de churn diario.
// Cron sugerido: "0 8 * * *"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ChurnFactors {
  daysSinceLastContact: number;
  pendingPaymentDays: number;
  overdueTasksCount: number;
  projectProgress: number;
  daysUntilProjectDue: number;
  contractMonthsActive: number;
}

function calculateChurnScore(f: ChurnFactors): number {
  let score = 0;
  if (f.daysSinceLastContact > 30) score += 30;
  else if (f.daysSinceLastContact > 21) score += 25;
  else if (f.daysSinceLastContact > 14) score += 15;
  else if (f.daysSinceLastContact > 7) score += 5;
  if (f.pendingPaymentDays > 30) score += 25;
  else if (f.pendingPaymentDays > 14) score += 20;
  else if (f.pendingPaymentDays > 7) score += 10;
  if (f.overdueTasksCount >= 3) score += 20;
  else if (f.overdueTasksCount === 2) score += 15;
  else if (f.overdueTasksCount === 1) score += 8;
  if (f.projectProgress < 30 && f.daysUntilProjectDue < 7) score += 15;
  else if (f.projectProgress < 50 && f.daysUntilProjectDue < 14) score += 10;
  if (f.contractMonthsActive < 3) score += 10;
  else if (f.contractMonthsActive < 6) score += 5;
  return Math.min(score, 100);
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: clients } = await supabase
    .from('clients')
    .select('*, tasks(status, due_date)')
    .in('status', ['active', 'at_risk']);

  for (const client of clients ?? []) {
    const overdue = (client.tasks ?? []).filter(
      (t: any) => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
    ).length;
    const daysSinceContact = client.last_contact_date
      ? Math.round((Date.now() - new Date(client.last_contact_date).getTime()) / 86400000)
      : 0;
    const monthsActive = client.start_date
      ? Math.round((Date.now() - new Date(client.start_date).getTime()) / (30 * 86400000))
      : 0;

    const score = calculateChurnScore({
      daysSinceLastContact: daysSinceContact,
      pendingPaymentDays: 0,
      overdueTasksCount: overdue,
      projectProgress: 100,
      daysUntilProjectDue: 30,
      contractMonthsActive: monthsActive,
    });

    if (score >= 60) {
      await supabase.from('ai_insights').insert({
        user_id: client.user_id,
        type: 'churn_risk',
        client_id: client.id,
        title: `${client.name} en riesgo de churn`,
        description: `Score de riesgo ${score}/100. Sin contacto hace ${daysSinceContact} días, ${overdue} tareas vencidas.`,
        severity: score >= 75 ? 'critical' : 'warning',
      });
      if (score >= 75) {
        await supabase.from('clients').update({ status: 'at_risk' }).eq('id', client.id);
      }
    }
  }

  return new Response('Churn analysis complete', { status: 200 });
});
