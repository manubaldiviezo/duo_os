// Edge Function: briefing matutino diario.
// Cron sugerido: "0 7 * * *" (ver supabase/config.toml)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGeminiServer } from '../_shared/gemini.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: settings } = await supabase
    .from('settings')
    .select('user_id')
    .filter('ai_features_enabled->morning_briefing', 'eq', 'true');

  for (const s of settings ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_name, user_name')
      .eq('id', s.user_id)
      .single();

    const { data: clients } = await supabase
      .from('clients')
      .select('name, monthly_fee, status')
      .eq('user_id', s.user_id)
      .in('status', ['active', 'at_risk']);

    const { data: overdue } = await supabase
      .from('tasks')
      .select('title')
      .eq('user_id', s.user_id)
      .neq('status', 'done')
      .lt('due_date', new Date().toISOString());

    const systemPrompt =
      `Eres el asistente de ${profile?.agency_name}. Genera el briefing matutino de ${profile?.user_name}. ` +
      `Clientes: ${JSON.stringify(clients)}. Tareas vencidas: ${JSON.stringify(overdue)}. ` +
      `Devuelve JSON: {"headline": string, "summary": string}.`;

    const briefing = await callGeminiServer(systemPrompt, 'Genera el briefing de hoy.');
    if (briefing?.headline) {
      await supabase.from('ai_insights').insert({
        user_id: s.user_id,
        type: 'morning_briefing',
        title: briefing.headline,
        description: briefing.summary ?? '',
        action_payload: briefing,
        severity: 'info',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });
    }
  }

  return new Response('Briefings generated', { status: 200 });
});
