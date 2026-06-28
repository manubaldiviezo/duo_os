// Edge Function: gemini-chat
// Llama a Gemini desde el servidor (clave en Deno.env, nunca en el frontend).
// Resiliente a saturación: reintenta el modelo principal y cae a uno alterno.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PRIMARY = 'gemini-3.5-flash';
const FALLBACK = 'gemini-3.1-flash-lite';
const urlFor = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const streamUrlFor = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { systemPrompt, userMessage, conversationHistory, expectJSON, temperature, stream } =
      await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY no configurada' });

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt ?? '' }] },
      { role: 'model', parts: [{ text: 'Entendido. Estoy listo.' }] },
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      { role: 'user', parts: [{ text: userMessage ?? '' }] },
    ];

    const payload = {
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
    };

    // ===== Modo STREAMING (solo chat de texto, no para expectJSON) =====
    if (stream && !expectJSON) {
      const openStream = (model: string) =>
        fetch(`${streamUrlFor(model)}&key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

      let gRes = await openStream(PRIMARY);
      if (!gRes.ok || !gRes.body) gRes = await openStream(FALLBACK);
      if (!gRes.ok || !gRes.body) {
        return json({ error: 'La IA está saturada ahora mismo. Intenta de nuevo en unos segundos.' });
      }

      const reader = gRes.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';

      const out = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // la última línea puede estar incompleta
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const jsonStr = t.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const obj = JSON.parse(jsonStr);
              const delta = obj?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* fragmento parcial: se completará en el próximo chunk */
            }
          }
        },
        cancel() {
          reader.cancel();
        },
      });

      return new Response(out, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }

    async function tryModel(model: string) {
      const res = await fetch(`${urlFor(model)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const msg: string = data?.error?.message ?? '';
      const overloaded =
        res.status === 503 ||
        res.status === 429 ||
        /overloaded|high demand|unavailable|try again/i.test(msg);
      if (res.ok && !data.error) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return { ok: Boolean(text), text, overloaded: false, error: text ? '' : 'sin texto' };
      }
      return { ok: false, text: '', overloaded, error: msg || `HTTP ${res.status}` };
    }

    // Reintenta el modelo principal hasta 3 veces ante saturación.
    for (let i = 0; i < 3; i++) {
      const r = await tryModel(PRIMARY);
      if (r.ok) return json({ text: r.text });
      if (!r.overloaded) return json({ error: r.error }); // error real: no insistir
      await sleep(700 * (i + 1));
    }

    // Último intento con el modelo alterno (más capacidad).
    const fb = await tryModel(FALLBACK);
    if (fb.ok) return json({ text: fb.text });

    return json({ error: 'La IA está saturada ahora mismo. Intenta de nuevo en unos segundos.' });
  } catch (e) {
    return json({ error: String(e) });
  }
});
