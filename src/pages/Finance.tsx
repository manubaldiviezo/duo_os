import { useCallback, useEffect, useState } from 'react';
import { IconPlus, IconCash } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { TopBar } from '@/components/layout/TopBar';
import { FinanceSummary } from '@/components/finance/FinanceSummary';
import { TransactionList } from '@/components/finance/TransactionList';
import { NewTransactionModal } from '@/components/finance/NewTransactionModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingDots } from '@/components/ui/LoadingDots';
import type { Transaction } from '@/types/app.types';

export function Finance() {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select('*, client:clients(name)')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast(error.message, 'error');
    }

    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    load();
  }, [load]);

  function openNewTransaction() {
    setEditingTransaction(null);
    setShowNew(true);
  }

  function closeTransactionModal() {
    setShowNew(false);
    setEditingTransaction(null);
  }

  function editTransaction(tx: Transaction) {
    setEditingTransaction(tx);
    setShowNew(true);
  }

  async function markPaid(tx: Transaction) {
    if (!user) return;

    const { error } = await supabase
      .from('transactions')
      .update({ type: 'income', date: new Date().toISOString().split('T')[0] })
      .eq('id', tx.id)
      .eq('user_id', user.id);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast('Pago marcado como cobrado', 'success');
    load();
  }

  async function deleteTransaction(tx: Transaction) {
    if (!user) return;

    const ok = window.confirm('¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer.');
    if (!ok) return;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', tx.id)
      .eq('user_id', user.id);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast('Movimiento eliminado', 'success');
    load();
  }

  const received = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const pending = transactions
    .filter((t) => t.type === 'pending_income')
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      <TopBar
        title="Finanzas"
        subtitle="Mes en curso"
        right={
          <button
            onClick={openNewTransaction}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white"
            aria-label="Nuevo movimiento"
          >
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="space-y-5 px-5 pt-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingDots />
          </div>
        ) : (
          <>
            <FinanceSummary received={received} pending={pending} expenses={expenses} />

            {transactions.length === 0 ? (
              <EmptyState
                icon={IconCash}
                title="Sin movimientos"
                description="Registra tu primer ingreso o gasto del mes."
              />
            ) : (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-ios-text-2">Movimientos</h2>
                <TransactionList
                  transactions={transactions}
                  onMarkPaid={markPaid}
                  onEdit={editTransaction}
                  onDelete={deleteTransaction}
                />
              </section>
            )}
          </>
        )}
      </div>

      <NewTransactionModal
        open={showNew}
        onClose={closeTransactionModal}
        onCreated={load}
        transactionToEdit={editingTransaction}
      />
    </div>
  );
}
