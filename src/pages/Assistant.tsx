import { useEffect, useRef, useState } from 'react';
import { IconSend, IconSparkles } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useAIStore } from '@/stores/aiStore';
import { useUIStore } from '@/stores/uiStore';
import { callGemini, type GeminiHistoryItem } from '@/lib/gemini';
import { buildSystemPrompt } from '@/lib/buildPrompt';
import { TopBar } from '@/components/layout/TopBar';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  '¿Qué hago primero hoy?',
  'Dame el briefing del día',
  '¿Cómo cierro el gap de MRR?',
  '¿Algún cliente en riesgo?',
];

export function Assistant() {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const { messages, thinking, addMessage, setThinking } = useAIStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function send(text: string) {
    if (!text.trim() || !user || thinking) return;
    addMessage({ role: 'user', text, createdAt: Date.now() });
    setInput('');
    setThinking(true);

    const systemPrompt = await buildSystemPrompt(user.id);
    const history: GeminiHistoryItem[] = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const response = await callGemini({ systemPrompt, userMessage: text, conversationHistory: history });

    // Detectar respuestas JSON (crear tareas)
    let replyText = typeof response === 'string' ? response : '';
    if (typeof response === 'string' && response.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(response.replace(/^```json\n?|\n?```$/g, '').trim());
        if (parsed.action === 'create_tasks' && Array.isArray(parsed.tasks)) {
          await supabase.from('tasks').insert(
            parsed.tasks.map((t: any) => ({
              user_id: user.id,
              title: t.title,
              client_id: t.client_id ?? null,
              category: t.category ?? 'other',
              priority: t.priority ?? 'medium',
              due_date: t.due_date ? new Date(t.due_date).toISOString() : null,
              description: t.description ?? null,
              created_via: 'ai_suggestion',
            }))
          );
          toast(`${parsed.tasks.length} tarea(s) creada(s)`, 'success');
          replyText = parsed.confirmation_message ?? 'Listo, creé las tareas.';
        }
      } catch {
        /* respuesta normal */
      }
    }

    addMessage({ role: 'model', text: replyText || 'Listo.', createdAt: Date.now() });
    setThinking(false);
  }

  return (
    <div className="flex h-[calc(100vh-84px)] flex-col">
      <TopBar title="Asistente" subtitle="Tu copiloto estratégico" />

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 py-3">
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-l">
              <IconSparkles size={30} className="text-brand" />
            </div>
            <p className="max-w-xs text-sm text-ios-text-3">
              Pregúntame lo que sea sobre tu agencia. Tengo el contexto completo de tus clientes,
              tareas y finanzas.
            </p>
            <div className="grid w-full gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl bg-ios-card px-4 py-3 text-left text-sm text-ios-text"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                m.role === 'user'
                  ? 'rounded-br-md bg-brand text-white'
                  : 'rounded-bl-md bg-ios-card text-ios-text'
              )}
            >
              {m.text}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-ios-card px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-ios-sep bg-ios-bg/80 px-5 py-3 backdrop-blur-ios">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Escribe un mensaje…"
          className="flex-1 rounded-full bg-ios-card px-4 py-2.5 text-sm text-ios-text outline-none"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
        >
          <IconSend size={18} />
        </button>
      </div>
    </div>
  );
}
