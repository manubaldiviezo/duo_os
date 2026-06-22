import { useState } from 'react';
import { IconMicrophone, IconPlayerStopFilled, IconSparkles } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useVoice } from '@/hooks/useVoice';
import { callGemini } from '@/lib/gemini';
import { buildSystemPrompt } from '@/lib/buildPrompt';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { LoadingDots } from '@/components/ui/LoadingDots';

interface ParsedTask {
  title: string;
  client_id: string | null;
  client_name?: string;
  category: string;
  priority: string;
  due_date: string | null;
  estimated_minutes?: number;
  description?: string;
}

interface VoiceCaptureProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function VoiceCapture({ open, onClose, onCreated }: VoiceCaptureProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const { isRecording, transcript, supported, start, stop } = useVoice();
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<ParsedTask[]>([]);

  async function handleStop() {
    stop();
    if (!transcript.trim() || !user) return;
    setProcessing(true);
    const systemPrompt = await buildSystemPrompt(user.id);
    const response = await callGemini({
      systemPrompt,
      userMessage: `Tengo este audio transcrito con tareas. Extrae cada tarea estructurada en JSON: "${transcript}"`,
      expectJSON: true,
    });
    setProcessing(false);
    if (response?.action === 'create_tasks' && Array.isArray(response.tasks)) {
      setPreview(response.tasks);
    } else {
      toast('No pude detectar tareas. Intenta de nuevo.', 'error');
    }
  }

  async function confirmTasks() {
    if (!user) return;
    const inserts = preview.map((t) => ({
      user_id: user.id,
      title: t.title,
      client_id: t.client_id,
      category: t.category,
      priority: t.priority,
      due_date: t.due_date ? new Date(t.due_date).toISOString() : null,
      description: t.description ?? null,
      estimated_minutes: t.estimated_minutes ?? null,
      created_via: 'voice',
    }));
    const { error } = await supabase.from('tasks').insert(inserts);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(`${inserts.length} tarea(s) creada(s)`, 'success');
    setPreview([]);
    onCreated();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Capturar por voz">
      {!supported && (
        <p className="text-sm text-ios-red">
          Tu navegador no soporta reconocimiento de voz. Usa Safari o Chrome.
        </p>
      )}

      {supported && preview.length === 0 && !processing && (
        <div className="flex flex-col items-center gap-5 py-4">
          <button
            onClick={isRecording ? handleStop : start}
            className={`flex h-24 w-24 items-center justify-center rounded-full text-white transition-all ${
              isRecording ? 'animate-pulse-slow bg-ios-red' : 'bg-brand'
            }`}
          >
            {isRecording ? <IconPlayerStopFilled size={36} /> : <IconMicrophone size={36} />}
          </button>
          <p className="text-center text-sm text-ios-text-2">
            {isRecording ? 'Grabando… toca para detener' : 'Toca para dictar tus tareas'}
          </p>
          {transcript && (
            <p className="max-h-32 overflow-y-auto rounded-xl bg-ios-bg p-3 text-sm text-ios-text-2">
              {transcript}
            </p>
          )}
        </div>
      )}

      {processing && (
        <div className="flex flex-col items-center gap-3 py-10">
          <IconSparkles size={28} className="text-brand" />
          <LoadingDots />
          <p className="text-sm text-ios-text-3">La IA está procesando tu audio…</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ios-text">
            Detecté {preview.length} tarea(s)
          </h3>
          {preview.map((t, i) => (
            <div key={i} className="rounded-xl bg-ios-bg p-3">
              <p className="text-sm font-medium text-ios-text">{t.title}</p>
              <p className="mt-0.5 text-xs text-ios-text-3">
                {t.client_name ?? 'Sin cliente'} · {t.due_date ?? 'sin fecha'} · {t.priority}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={confirmTasks}>
              Confirmar
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setPreview([])}>
              Descartar
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
