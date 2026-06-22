import type { Icon } from '@tabler/icons-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export interface KPIItem {
  label: string;
  value: string;
  icon: Icon;
  tone?: 'default' | 'red' | 'green' | 'orange';
}

export function KPIGrid({ items }: { items: KPIItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((kpi) => (
        <Card key={kpi.label} className="p-3.5">
          <kpi.icon
            size={22}
            className={cn(
              kpi.tone === 'red' && 'text-ios-red',
              kpi.tone === 'green' && 'text-ios-green',
              kpi.tone === 'orange' && 'text-ios-orange',
              (!kpi.tone || kpi.tone === 'default') && 'text-brand'
            )}
          />
          <div className="mt-2 text-2xl font-bold text-ios-text">{kpi.value}</div>
          <div className="text-xs text-ios-text-3">{kpi.label}</div>
        </Card>
      ))}
    </div>
  );
}
