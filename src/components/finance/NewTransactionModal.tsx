import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Client, Transaction, TransactionType } from '@/types/app.types';

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'pending_income', label: 'Por cobrar' },
];

interface NewTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  transactionToEdit?: Transaction | null;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function normalizeDate(value?: string | null) {
  if (!value) return todayISO();
  return value.includes('T') ? value.split('T')[0] : value;
}

export function NewTransactionModal({
  open,
  onClose,
  onCreated,
  transactionToEdit,
}: NewTransactionModalProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [clients, setClients] = useState<Client[]>([]);
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(transactionToEdit);

  useEffect(() => {
    if (!open || !user) return;

    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
      .then(({ data }) => setClients((data as Client[]) ?? []));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount ?? ''));
      setDescription(transactionToEdit.description ?? '');
      setClientId(transactionToEdit.client_id ?? '');
      setCategory(transactionToEdit.category ?? '');
      setPaymentMethod(transactionToEdit.payment_method ?? '');
      setNotes(transactionToEdit.notes ?? '');
      setDate(normalizeDate(transactionToEdit.date));
      return;
    }

    setType('income');
    setAmount('');
    setDescription('');
    setClientId('');
    setCategory('');
    setPaymentMethod('');
    setNotes('');
    setDate(todayISO());
  }, [open, transactionToEdit]);

  async function save() {
    if (!user || !amount || !description.trim()) {
      toast('Completa monto y descripción', 'error');
      return;
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast('El monto debe ser mayor a 0', 'error');
      return;
    }

    setLoading(true);

    const payload = {
      user_id: user.id,
      type,
      amount: parsedAmount,
      description: description.trim(),
      client_id: clientId || null,
      category: category.trim() || null,
      payment_method: paymentMethod.trim() || null,
      notes: notes.trim() || null,
      date,
    };

    const { error } = isEditing && transactionToEdit
      ? await supabase
          .from('transactions')
          .update(payload)
          .eq('id', transactionToEdit.id)
          .eq('user_id', user.id)
      : await supabase.from('transactions').insert(payload);

    setLoading(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast(isEditing ? 'Movimiento actualizado' : 'Transacción registrada', 'success');
    onCreated();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEditing ? 'Editar movimiento' : 'Nueva transacción'}>
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
          min="0"
          step="0.01"
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

        <Input
          label="Categoría"
          placeholder="Mensualidad, software, pauta, producción..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <Input
          label="Método de pago"
          placeholder="USDT, transferencia, efectivo..."
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />

        <Input
          label="Notas"
          placeholder="Detalle opcional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Button size="lg" className="w-full" loading={loading} onClick={save}>
          {isEditing ? 'Guardar cambios' : 'Registrar'}
        </Button>
      </div>
    </BottomSheet>
  );
}
