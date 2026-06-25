// Edge Function: send-email
// Envía correos vía la API de Resend. La RESEND_API_KEY vive server-side (Deno.env),
// NUNCA en el frontend. Se invoca desde la app con supabase.functions.invoke('send-email').
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { to, subject, html, replyTo } = await req.json();
    if (!to || !subject || !html) {
      return json({ error: 'Faltan campos requeridos: to, subject, html' });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return json({ error: 'RESEND_API_KEY no está configurada en Supabase' });
    }

    // Debe ser un remitente de un dominio verificado en Resend.
    // Para pruebas, Resend permite 'onboarding@resend.dev' hacia tu propio correo.
    const from = Deno.env.get('RESEND_FROM') ?? 'DUO Community <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json({ error: data?.message ?? data?.name ?? 'Error al enviar el correo' });
    }

    return json({ success: true, id: data.id });
  } catch (e) {
    return json({ error: String(e) });
  }
});
