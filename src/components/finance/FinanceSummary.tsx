import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface FinanceSummaryProps {
  received: number;
  pending: number;
  expenses: number;
}

export function FinanceSummary({ received, pending, expenses }: FinanceSummaryProps) {
  const margin = received - expenses;
  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm text-ios-text-3">Margen del mes</p>
        <p className="mt-1 text-3xl font-extrabold text-ios-text">{formatCurrency(margin)}</p>
        <p className="mt-1 text-xs text-ios-text-3">Ingresos cobrados − gastos</p>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-[11px] text-ios-text-3">Cobrado</p>
          <p className="mt-1 text-base font-bold text-ios-green">{formatCurrency(received)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-ios-text-3">Por cobrar</p>
          <p className="mt-1 text-base font-bold text-ios-orange">{formatCurrency(pending)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-ios-text-3">Gastos</p>
          <p className="mt-1 text-base font-bold text-ios-red">{formatCurrency(expenses)}</p>
        </Card>
      </div>
    </div>
  );
}
