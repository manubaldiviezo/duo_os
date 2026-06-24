// Edge Function: create-meeting
// Crea un evento en Google Calendar con link de Meet, invita por email al asistente
// (sendUpdates=all), lo guarda en la tabla events y devuelve el link de Meet.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown) =>
    new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'No autenticado' });

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: settings } = await admin
      .from('settings')
      .select('google_refresh_token')
      .eq('user_id', user.id)
      .single();

    const refresh = settings?.google_refresh_token;
    if (!refresh) return json({ error: 'Primero conecta Google Calendar en Perfil → Integraciones.' });

    // Renovar access token con el refresh token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: refresh,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return json({ error: 'No pude renovar el acceso a Google. Reconecta Calendar.' });

    const { title, start, end, attendeeEmail, description, client_id } = await req.json();

    const event = {
      summary: title,
      description: description ?? '',
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      conferenceData: {
        createRequest: { requestId: `duo-${user.id}-${Date.parse(start)}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
    };

    const calRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    );
    const calData = await calRes.json();
    if (!calRes.ok) return json({ error: calData?.error?.message ?? 'Error al crear el evento en Google' });

    const meetLink = calData.hangoutLink ?? calData.conferenceData?.entryPoints?.[0]?.uri ?? null;

    await admin.from('events').insert({
      user_id: user.id,
      client_id: client_id ?? null,
      title,
      description: description ?? null,
      start_time: start,
      end_time: end,
      meet_link: meetLink,
      google_event_id: calData.id,
      attendees: attendeeEmail ? [attendeeEmail] : [],
    });

    return json({ success: true, meetLink, htmlLink: calData.htmlLink });
  } catch (e) {
    return json({ error: String(e) });
  }
});
