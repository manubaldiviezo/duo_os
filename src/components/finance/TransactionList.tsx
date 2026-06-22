import { IconArrowDownLeft, IconArrowUpRight, IconClock } from '@tabler/icons-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/app.types';

export function TransactionList({
  transactions,
  onMarkPaid,
}: {
  transactions: Transaction[];
  onMarkPaid?: (tx: Transaction) => void;
}) {
  return (
    <Card className="divide-y divide-ios-sep p-0">
      {transactions.map((tx) => {
        const isIncome = tx.type === 'income';
        const isPending = tx.type === 'pending_income';
        return (
          <div key={tx.id} className="flex items-center gap-3 p-3.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                isIncome ? 'bg-ios-green/15' : isPending ? 'bg-ios-orange/15' : 'bg-ios-red/15'
              }`}
            >
              {isIncome ? (
                <IconArrowDownLeft size={18} className="text-ios-green" />
              ) : isPending ? (
                <IconClock size={18} className="text-ios-orange" />
              ) : (
                <IconArrowUpRight size={18} className="text-ios-red" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ios-text">{tx.description}</p>
              <p className="text-xs text-ios-text-3">
                {formatDate(tx.date)}
                {tx.client?.name ? ` · ${tx.client.name}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  tx.type === 'expense' ? 'text-ios-red' : 'text-ios-text'
                }`}
              >
                {tx.type === 'expense' ? '−' : '+'}
                {formatCurrency(Number(tx.amount))}
              </p>
              {isPending && onMarkPaid && (
                <button onClick={() => onMarkPaid(tx)} className="text-[11px] font-medium text-brand">
                  Marcar cobrado
                </button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
