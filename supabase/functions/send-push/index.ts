// Edge Function: send-push
// Envía notificaciones Web Push a los dispositivos del usuario autenticado.
// Secretos requeridos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (Supabase -> Edge Functions -> Secrets).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const pub = Deno.env.get('VAPID_PUBLIC_KEY');
    const priv = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!pub || !priv) return json({ error: 'Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Secrets' });
    webpush.setVapidDetails('mailto:duomarketing2024@gmail.com', pub, priv);

    const { title, body, url, target_user_id } = await req.json();

    // Usuario autenticado (el que invoca) — o un destinatario explícito si lo
    // llama otra función server-side con service role.
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let userId = target_user_id as string | undefined;
    if (!userId) {
      const token = authHeader.replace('Bearer ', '');
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id;
    }
    if (!userId) return json({ error: 'No se pudo identificar al usuario.' });

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (!subs?.length) return json({ error: 'Este usuario no tiene dispositivos suscritos.' });

    const payload = JSON.stringify({
      title: title ?? 'DUO Community',
      body: body ?? '',
      url: url ?? '/',
    });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e) {
        // 404/410 = suscripción muerta: limpiarla.
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }

    return json({ success: true, sent });
  } catch (e) {
    return json({ error: String(e) });
  }
});
