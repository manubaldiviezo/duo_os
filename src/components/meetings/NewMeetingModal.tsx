import { useEffect, useState } from 'react';
import { IconVideo, IconCopy, IconExternalLink } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Client } from '@/types/app.types';

interface NewMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function NewMeetingModal({ open, onClose, onCreated }: NewMeetingModalProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('30');
  const [clientId, setClientId] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setMeetLink(null);
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setClients((data as Client[]) ?? []));
  }, [open, user]);

  async function create() {
    if (!title.trim() || !date || !time) {
      toast('Completa título, fecha y hora', 'error');
      return;
    }
    setLoading(true);
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + (Number(duration) || 30) * 60000);
    const { data, error } = await supabase.functions.invoke('create-meeting', {
      body: {
        title: title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        attendeeEmail: attendeeEmail.trim() || null,
        client_id: clientId || null,
      },
    });
    setLoading(false);
    const errMsg = error?.message ?? (data?.error as string | undefined);
    if (errMsg) {
      toast(errMsg, 'error');
      return;
    }
    setMeetLink(data?.meetLink ?? null);
    toast('Reunión creada e invitación enviada', 'success');
    onCreated?.();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva reunión">
      {meetLink ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-l">
              <IconVideo size={28} className="text-brand" />
            </div>
            <p className="text-sm text-ios-text-2">¡Reunión agendada! Se envió la invitación por correo y quedó en tu Google Calendar.</p>
            <div className="w-full rounded-xl bg-ios-bg p-3 text-xs text-ios-text-2 break-all">{meetLink}</div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                navigator.clipboard?.writeText(meetLink);
                toast('Link copiado', 'success');
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <IconCopy size={16} /> Copiar
              </span>
            </Button>
            <a href={meetLink} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full">
                <span className="flex items-center justify-center gap-1">
                  <IconExternalLink size={16} /> Abrir Meet
                </span>
              </Button>
            </a>
          </div>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Listo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reunión de seguimiento" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Hora" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Duración (min)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
            >
              {['15', '30', '45', '60', '90'].map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Cliente (opcional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
            >
              <option value="">Sin cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Email del invitado"
            type="email"
            value={attendeeEmail}
            onChange={(e) => setAttendeeEmail(e.target.value)}
            placeholder="invitado@correo.com"
          />
          <Button size="lg" className="w-full" loading={loading} onClick={create}>
            Crear reunión con Meet
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
