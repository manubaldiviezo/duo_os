import { useCallback, useEffect, useState } from 'react';
import { IconBulb, IconMicrophone, IconPlayerStopFilled, IconTrash } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useVoice } from '@/hooks/useVoice';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import type { Idea } from '@/types/app.types';

export function Ideas() {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const { isRecording, transcript, supported, start, stop } = useVoice();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setIdeas((data as Idea[]) ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isRecording) setText(transcript);
  }, [transcript, isRecording]);

  async function save() {
    if (!user || !text.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('ideas').insert({
      user_id: user.id,
      content: text.trim(),
      type: isRecording || transcript ? 'voice' : 'text',
    });
    if (isRecording) stop();
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    setText('');
    load();
  }

  async function remove(id: string) {
    await supabase.from('ideas').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <TopBar title="Ideas" subtitle="Tu espacio creativo" />

      <div className="space-y-4 px-5 pt-2">
        <Card className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isRecording ? 'Escuchando…' : 'Anota una idea, concepto, gancho creativo…'}
            rows={3}
          />
          <div className="flex gap-2">
            {supported && (
              <button
                onClick={() => (isRecording ? stop() : start())}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  isRecording ? 'animate-pulse-slow bg-ios-red text-white' : 'bg-brand-l text-brand'
                )}
                aria-label="Dictar idea"
              >
                {isRecording ? <IconPlayerStopFilled size={18} /> : <IconMicrophone size={18} />}
              </button>
            )}
            <Button className="flex-1" loading={saving} onClick={save} disabled={!text.trim()}>
              Guardar idea
            </Button>
          </div>
        </Card>

        {ideas.length === 0 ? (
          <EmptyState
            icon={IconBulb}
            title="Sin ideas aún"
            description="Captura tus ideas por texto o voz cuando se te ocurran."
          />
        ) : (
          <div className="space-y-2">
            {ideas.map((idea) => (
              <Card key={idea.id} className="flex items-start gap-3">
                <IconBulb size={18} className="mt-0.5 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-ios-text">{idea.content}</p>
                  <p className="mt-1 text-[11px] text-ios-text-3">
                    {idea.type === 'voice' ? '🎙 ' : ''}
                    {formatDate(idea.created_at)}
                  </p>
                </div>
                <button onClick={() => remove(idea.id)} className="text-ios-text-3">
                  <IconTrash size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
