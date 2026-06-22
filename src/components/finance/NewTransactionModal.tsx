import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Client, TransactionType } from '@/types/app.types';

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'pending_income', label: 'Por cobrar' },
];

interface NewTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewTransactionModal({ open, onClose, onCreated }: NewTransactionModalProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [clients, setClients] = useState<Client[]>([]);
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setClients((data as Client[]) ?? []));
  }, [open, user]);

  async function save() {
    if (!user || !amount || !description.trim()) {
      toast('Completa monto y descripción', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      description: description.trim(),
      client_id: clientId || null,
      date,
    });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Transacción registrada', 'success');
    setAmount('');
    setDescription('');
    onCreated();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva transacción">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                'rounded-xl py-2.5 text-xs font-medium transition-colors',
                type === t.value ? 'bg-brand text-white' : 'bg-ios-bg text-ios-text-2'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          label="Monto (USD)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ios-text-2">Cliente</label>
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
        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button size="lg" className="w-full" loading={loading} onClick={save}>
          Registrar
        </Button>
      </div>
    </BottomSheet>
  );
}
