// Edge Function: genera las mensualidades recurrentes el día 1 de cada mes.
// Cron sugerido: "0 0 1 * *"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Crea un "pending_income" por cada cliente activo con fee > 0.
  const { data: clients } = await supabase
    .from('clients')
    .select('id, user_id, name, monthly_fee')
    .in('status', ['active', 'at_risk'])
    .gt('monthly_fee', 0);

  const today = new Date().toISOString().split('T')[0];

  const inserts = (clients ?? []).map((c) => ({
    user_id: c.user_id,
    client_id: c.id,
    type: 'pending_income',
    amount: c.monthly_fee,
    description: `Mensualidad - ${c.name}`,
    category: 'mensualidad',
    date: today,
    is_recurring: true,
    recurring_day: 1,
  }));

  if (inserts.length) {
    await supabase.from('transactions').insert(inserts);
  }

  return new Response(`Generated ${inserts.length} recurring transactions`, { status: 200 });
});
