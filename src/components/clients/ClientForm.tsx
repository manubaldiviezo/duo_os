import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Client, ClientStatus } from '@/types/app.types';

const STATUSES: { value: ClientStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'at_risk', label: 'En riesgo' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'paused', label: 'Pausado' },
  { value: 'churned', label: 'Perdido' },
];

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: Client | null;
}

export function ClientForm({ open, onClose, onSaved, client }: ClientFormProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [name, setName] = useState(client?.name ?? '');
  const [industry, setIndustry] = useState(client?.industry ?? '');
  const [fee, setFee] = useState(String(client?.monthly_fee ?? ''));
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'active');
  const [email, setEmail] = useState(client?.contact_email ?? '');
  const [whatsapp, setWhatsapp] = useState(client?.whatsapp ?? '');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!user || !name.trim()) {
      toast('Escribe el nombre del cliente', 'error');
      return;
    }
    setLoading(true);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      industry: industry.trim() || null,
      monthly_fee: Number(fee) || 0,
      status,
      contact_email: email.trim() || null,
      whatsapp: whatsapp.trim() || null,
    };
    const { error } = client
      ? await supabase.from('clients').update(payload).eq('id', client.id)
      : await supabase.from('clients').insert(payload);
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(client ? 'Cliente actualizado' : 'Cliente creado', 'success');
    onSaved();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={client ? 'Editar cliente' : 'Nuevo cliente'}>
      <div className="space-y-3">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Industria" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <Input
          label="Fee mensual (USD)"
          type="number"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientStatus)}
            className="w-full rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <Button size="lg" className="w-full" loading={loading} onClick={save}>
          Guardar
        </Button>
      </div>
    </BottomSheet>
  );
}
