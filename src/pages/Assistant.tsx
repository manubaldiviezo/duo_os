import { useEffect, useRef, useState } from 'react';
import {
  IconSend,
  IconSparkles,
  IconMicrophone,
  IconPlayerStopFilled,
  IconHistory,
  IconPencilPlus,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { PLANS, isFreeExpired, type Plan } from '@/lib/plans';
import { callGemini, type GeminiHistoryItem } from '@/lib/gemini';
import { buildSystemPrompt } from '@/lib/buildPrompt';
import { parseAction, describeAction, executeAction, type AIAction } from '@/lib/aiActions';
import { useVoice } from '@/hooks/useVoice';
import { TopBar } from '@/components/layout/TopBar';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/types/app.types';

interface Msg {
  role: 'user' | 'model';
  text: string;
}

interface PendingAction {
  action: AIAction;
  desc: { title: string; lines: string[] };
}

interface SessionRow {
  id: string;
  title: string | null;
  updated_at: string;
}

const START_PROMPT =
  'Ayúdame a configurar mi agencia en DUO Community desde cero. Primero explícame en pasos simples qué datos debo cargar. Luego guíame para agregar múltiples clientes, tareas, gastos o reuniones por bloques. No crees ni edites nada todavía sin mostrarme un resumen y pedirme confirmación.';

const SUGGESTIONS = [
  {
    label: '¿Agendar nueva reunión?',
    prompt:
      'Ayúdame a agendar una nueva reunión en Google Calendar. Pídeme solo los datos necesarios: título, fecha, hora, duración, invitados y descripción. Antes de crearla, muéstrame un resumen para confirmar.',
  },
  {
    label: 'Asignar nueva tarea',
    prompt:
      'Ayúdame a crear una nueva tarea para mi agencia. Pídeme responsable, cliente, fecha límite, prioridad y descripción. Antes de crearla, muéstrame un resumen para confirmar.',
  },
  {
    label: 'Agregar clientes a la agencia',
    prompt:
      'Ayúdame a agregar varios clientes a mi agencia. Dame un formato simple para cargar múltiples clientes de una sola vez con nombre, contacto, servicio, estado y notas. No guardes nada hasta que confirme.',
  },
  {
    label: 'Agregar pagos en finanzas',
    prompt:
      'Ayúdame a registrar pagos de clientes en finanzas. Pídeme cliente, monto, moneda, fecha, concepto y estado del pago. Si quiero agregar varios pagos, dame un formato por bloques.',
  },
  {
    label: 'Organizar mi día',
    prompt:
      'Revisa mis tareas, reuniones y recordatorios de hoy. Ordénalos por prioridad y dime qué debería hacer primero.',
  },
];

export function Assistant() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const [usage, setUsage] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const { isRecording, transcript, supported, start, stop } = useVoice();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, pending]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setMembers((data as TeamMember[]) ?? []));
  }, [user]);

  // Uso de IA del mes con reseteo mensual.
  useEffect(() => {
    const reset = profile?.ai_messages_reset;
    const month = new Date().toISOString().slice(0, 7);
    const sameMonth = reset ? reset.slice(0, 7) === month : false;
    setUsage(sameMonth ? profile?.ai_messages_month ?? 0 : 0);
  }, [profile?.ai_messages_month, profile?.ai_messages_reset]);

  // La voz va llenando la caja de texto.
  useEffect(() => {
    if (isRecording) setInput(transcript);
  }, [transcript, isRecording]);

  async function persist(msgs: Msg[]): Promise<void> {
    if (!user) return;

    if (!conversationId) {
      const title = msgs.find((m) => m.role === 'user')?.text.slice(0, 50) ?? 'Conversación';

      const { data } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title, messages: msgs })
        .select('id')
        .single();

      if (data?.id) setConversationId(data.id);

      // Limitar chats guardados según el plan.
      const cap = PLANS[(profile?.plan ?? 'free') as Plan].savedChats;

      const { data: all } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (all && all.length > cap) {
        await supabase
          .from('ai_conversations')
          .delete()
          .in(
            'id',
            all.slice(cap).map((r: any) => r.id)
          );
      }
    } else {
      await supabase.from('ai_conversations').update({ messages: msgs }).eq('id', conversationId);
    }
  }

  async function send(text: string) {
    if (!text.trim() || !user || thinking) return;

    // Límites por plan.
    const plan = (profile?.plan ?? 'free') as Plan;

    if (isFreeExpired(plan, profile?.plan_started_at)) {
      toast('Tu prueba gratis de 21 días terminó. Mejora tu plan para seguir usando la IA.', 'info');
      navigate('/planes');
      return;
    }

    if (usage >= PLANS[plan].aiMessagesPerMonth) {
      toast('Alcanzaste el límite de mensajes de IA de tu plan.', 'info');
      navigate('/planes');
      return;
    }

    setUsage((u) => u + 1);
    void supabase.rpc('bump_ai_usage');

    if (isRecording) stop();

    const base: Msg[] = [...messages, { role: 'user', text }];
    setMessages(base);
    setInput('');
    setThinking(true);

    const systemPrompt = await buildSystemPrompt(user.id);
    const history: GeminiHistoryItem[] = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const response = await callGemini({
      systemPrompt,
      userMessage: text,
      conversationHistory: history,
    });

    const replyText = typeof response === 'string' ? response : '';
    const action = parseAction(replyText);

    setThinking(false);

    if (action) {
      setPending({ action, desc: describeAction(action) });
      await persist(base);
    } else {
      const next: Msg[] = [...base, { role: 'model', text: replyText || 'Listo.' }];
      setMessages(next);
      await persist(next);
    }
  }

  async function confirmAction() {
    if (!pending || !user) return;

    setThinking(true);

    const result = await executeAction(pending.action, {
      userId: user.id,
      members,
    });

    const next: Msg[] = [...messages, { role: 'model', text: result }];

    setMessages(next);
    setPending(null);
    setThinking(false);
    await persist(next);

    toast('Acción aplicada', 'success');
  }

  function cancelAction() {
    if (!pending) return;
    setMessages((prev) => [...prev, { role: 'model', text: 'Acción cancelada.' }]);
    setPending(null);
  }

  function newChat() {
    setMessages([]);
    setConversationId(null);
    setPending(null);
  }

  async function openSessions() {
    if (!user) return;

    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    setSessions((data as SessionRow[]) ?? []);
    setShowSessions(true);
  }

  async function loadSession(s: SessionRow) {
    const { data } = await supabase
      .from('ai_conversations')
      .select('messages')
      .eq('id', s.id)
      .single();

    setMessages(((data?.messages as Msg[]) ?? []).filter((m) => m && m.role && m.text));
    setConversationId(s.id);
    setPending(null);
    setShowSessions(false);
  }

  function micClick() {
    if (isRecording) stop();
    else start();
  }

  return (
    <div className="flex h-[calc(100vh-84px)] flex-col">
      <TopBar
        title="Asistente"
        subtitle="Tu copiloto operativo"
        right={
          <div className="flex gap-2">
            <button
              onClick={openSessions}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-l text-brand"
              aria-label="Historial"
            >
              <IconHistory size={20} />
            </button>

            <button
              onClick={newChat}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white"
              aria-label="Nuevo chat"
            >
              <IconPencilPlus size={20} />
            </button>
          </div>
        }
      />

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 py-3">
        {messages.length === 0 && !thinking && !pending && (
          <div className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-l">
              <IconSparkles size={30} className="text-brand" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-ios-text">¿Qué quieres hacer ahora?</h2>
              <p className="mt-1 max-w-xs text-sm text-ios-text-3">
                Puedes configurar tu agencia, crear tareas, agendar reuniones, cargar clientes o
                registrar pagos usando texto o voz.
              </p>
            </div>

            <button
              onClick={() => send(START_PROMPT)}
              className="w-full rounded-2xl bg-brand px-4 py-4 text-left text-sm font-semibold text-white"
            >
              🚀 Comenzar a configurar mi agencia en DUO
              <span className="mt-1 block text-xs font-normal text-white/80">
                Ideal si estás entrando por primera vez.
              </span>
            </button>

            <div className="grid w-full gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="rounded-xl bg-ios-card px-4 py-3 text-left text-sm text-ios-text"
                >
                  {s.label}
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

        {pending && (
          <div className="rounded-2xl border border-brand/30 bg-ios-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <IconSparkles size={18} className="text-brand" />
              <span className="text-sm font-semibold text-ios-text">{pending.desc.title}</span>
            </div>

            {pending.desc.lines.length > 0 && (
              <div className="mb-3 space-y-0.5">
                {pending.desc.lines.map((line, index) => (
                  <p key={index} className="text-sm text-ios-text-2">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <p className="mb-3 text-xs text-ios-text-3">
              {pending.action.confirmation_message ?? '¿Confirmas esta acción?'}
            </p>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={confirmAction}>
                <span className="flex items-center justify-center gap-1">
                  <IconCheck size={16} /> Confirmar
                </span>
              </Button>

              <Button size="sm" variant="secondary" className="flex-1" onClick={cancelAction}>
                <span className="flex items-center justify-center gap-1">
                  <IconX size={16} /> Cancelar
                </span>
              </Button>
            </div>
          </div>
        )}

        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-ios-card px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-ios-sep bg-ios-bg/80 px-5 py-3 backdrop-blur-ios">
        {supported && (
          <button
            onClick={micClick}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              isRecording ? 'animate-pulse-slow bg-ios-red text-white' : 'bg-brand-l text-brand'
            )}
            aria-label="Dictar"
          >
            {isRecording ? <IconPlayerStopFilled size={18} /> : <IconMicrophone size={18} />}
          </button>
        )}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder={isRecording ? 'Escuchando…' : 'Escribe o dicta un mensaje…'}
          className="flex-1 rounded-full bg-ios-card px-4 py-2.5 text-sm text-ios-text outline-none"
        />

        <button
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
          aria-label="Enviar"
        >
          <IconSend size={18} />
        </button>
      </div>

      <BottomSheet open={showSessions} onClose={() => setShowSessions(false)} title="Conversaciones">
        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-ios-text-3">
            Aún no tienes conversaciones guardadas.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                className="w-full rounded-xl bg-ios-bg px-4 py-3 text-left"
              >
                <p className="truncate text-sm font-medium text-ios-text">
                  {s.title ?? 'Conversación'}
                </p>
                <p className="text-xs text-ios-text-3">
                  {new Date(s.updated_at).toLocaleDateString('es-BO')}
                </p>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
