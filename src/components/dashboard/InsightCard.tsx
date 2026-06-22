import { IconSparkles, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { AiInsight } from '@/types/app.types';

interface InsightCardProps {
  insight: AiInsight;
  onAck?: (id: string) => void;
}

export function InsightCard({ insight, onAck }: InsightCardProps) {
  const critical = insight.severity === 'critical';
  const warning = insight.severity === 'warning';

  return (
    <Card
      className={cn(
        'border',
        critical && 'border-ios-red/30',
        warning && 'border-ios-orange/30',
        !critical && !warning && 'border-brand/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            critical ? 'bg-ios-red/15' : warning ? 'bg-ios-orange/15' : 'bg-brand-l'
          )}
        >
          {critical || warning ? (
            <IconAlertTriangle
              size={18}
              className={critical ? 'text-ios-red' : 'text-ios-orange'}
            />
          ) : (
            <IconSparkles size={18} className="text-brand" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ios-text">{insight.title}</h3>
          <p className="mt-0.5 text-sm text-ios-text-2">{insight.description}</p>
        </div>
        {onAck && (
          <button onClick={() => onAck(insight.id)} className="text-ios-text-3">
            <IconX size={18} />
          </button>
        )}
      </div>
    </Card>
  );
}
