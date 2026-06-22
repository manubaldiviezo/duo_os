import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/lib/utils';
import type { MRRResult } from '@/lib/mrr';

export function MRRTracker({ mrr }: { mrr: MRRResult }) {
  const pct = mrr.goal > 0 ? (mrr.current / mrr.goal) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-brand to-brand-d text-white">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-white/80">MRR actual</span>
        <span className="text-sm text-white/70">Objetivo {formatCurrency(mrr.goal)}</span>
      </div>
      <div className="mt-1 text-4xl font-extrabold">{formatCurrency(mrr.current)}</div>

      <div className="mt-4">
        <ProgressBar value={pct} color="#FFFFFF" className="bg-white/25" />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-white/80">{pct.toFixed(0)}% del objetivo</span>
        {mrr.gap > 0 ? (
          <span className="font-semibold text-white">Faltan {formatCurrency(mrr.gap)}</span>
        ) : (
          <span className="font-semibold text-white">¡Objetivo alcanzado! 🎉</span>
        )}
      </div>
    </Card>
  );
}
