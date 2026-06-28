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
    const { to, subject, html, replyTo, fromName, text } = await req.json();
    if (!to || !subject || !html) {
      return json({ error: 'Faltan campos requeridos: to, subject, html' });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return json({ error: 'RESEND_API_KEY no está configurada en Supabase' });
    }

    // Remitente: dominio verificado en Resend. Si llega fromName, se usa como
    // nombre visible (ej. "DUO · Agencia") conservando la dirección verificada.
    // Un remitente con nombre de persona/agencia ayuda a caer en "Principal" de Gmail.
    const base = Deno.env.get('RESEND_FROM') ?? 'DUO Community <onboarding@resend.dev>';
    const buildFrom = (name?: string) => {
      if (!name) return base;
      const m = base.match(/<([^>]+)>/);
      const address = m ? m[1] : base;
      const safe = String(name).replace(/[<>"]/g, '').trim();
      return safe ? `${safe} <${address}>` : base;
    };

    // Versión texto plano: los correos 1:1 reales siempre la traen; reduce que
    // Gmail lo trate como boletín y lo mande a "Notificaciones/Promociones".
    const htmlToText = (h: string) =>
      h
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: buildFrom(fromName),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || htmlToText(html),
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
