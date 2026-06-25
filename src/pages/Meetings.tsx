import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconChevronLeft,
  IconPlus,
  IconVideo,
  IconExternalLink,
  IconTrash,
  IconCalendarEvent,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { NewMeetingModal } from '@/components/meetings/NewMeetingModal';
import { formatDate, formatTime } from '@/lib/utils';

interface MeetingRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  meet_link: string | null;
  client?: { name: string } | null;
}

export function Meetings() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    // Reuniones desde hace 1 día en adelante (próximas y de hoy).
    const from = new Date(Date.now() - 86400000).toISOString();
    const { data } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, meet_link, client:clients(name)')
      .eq('user_id', user.id)
      .gte('start_time', from)
      .order('start_time', { ascending: true });
    setMeetings((data as MeetingRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(m: MeetingRow) {
    if (!window.confirm('¿Quitar esta reunión de la app? (No se borra de Google Calendar)')) return;
    await supabase.from('events').delete().eq('id', m.id);
    toast('Reunión quitada de la lista', 'success');
    load();
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-ios-bg/80 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-ios">
        <button onClick={() => navigate(-1)} className="flex items-center text-brand md:invisible">
          <IconChevronLeft size={24} />
          <span className="text-sm">Atrás</span>
        </button>
        <button
          onClick={() => setShowNew(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white"
          aria-label="Nueva reunión"
        >
          <IconPlus size={20} />
        </button>
      </header>

      <div className="px-5 pt-1">
        <h1 className="mb-4 text-[28px] font-bold leading-tight text-ios-text">Reuniones</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingDots />
          </div>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={IconCalendarEvent}
            title="Sin reuniones agendadas"
            description="Crea una reunión con Google Meet e invita por correo."
            action={<Button onClick={() => setShowNew(true)}>Nueva reunión</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {meetings.map((m) => (
              <Card key={m.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-l">
                  <IconVideo size={20} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ios-text">{m.title}</p>
                  <p className="text-xs text-ios-text-3">
                    {formatDate(m.start_time)} · {formatTime(m.start_time)}
                    {m.end_time ? `–${formatTime(m.end_time)}` : ''}
                    {m.client?.name ? ` · ${m.client.name}` : ''}
                  </p>
                </div>
                {m.meet_link && (
                  <a
                    href={m.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white"
                    aria-label="Abrir Meet"
                  >
                    <IconExternalLink size={16} />
                  </a>
                )}
                <button onClick={() => remove(m)} className="text-ios-text-3" aria-label="Quitar">
                  <IconTrash size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NewMeetingModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </div>
  );
}
