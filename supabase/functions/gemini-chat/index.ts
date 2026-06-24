// Edge Function: gemini-chat
// Llama a Gemini desde el servidor. La GEMINI_API_KEY vive en Deno.env (NUNCA en el frontend).
// El frontend la invoca con supabase.functions.invoke('gemini-chat', { body: {...} }).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { systemPrompt, userMessage, conversationHistory, expectJSON, temperature } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY no está configurada en Supabase' });

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt ?? '' }] },
      { role: 'model', parts: [{ text: 'Entendido. Estoy listo.' }] },
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      { role: 'user', parts: [{ text: userMessage ?? '' }] },
    ];

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: 1500,
          ...(expectJSON && { responseMimeType: 'application/json' }),
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return json({ error: data?.error?.message ?? `HTTP ${res.status}` });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? 'sin contenido';
      return json({ error: `La IA no devolvió texto (motivo: ${reason})` });
    }

    return json({ text });
  } catch (e) {
    return json({ error: String(e) });
  }
});
