import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { formatCurrency } from '@/lib/utils';
import type { Client, ClientStatus } from '@/types/app.types';

const STATUS: Record<ClientStatus, { label: string; color: 'green' | 'orange' | 'red' | 'gray' | 'blue' }> = {
  active: { label: 'Activo', color: 'green' },
  at_risk: { label: 'En riesgo', color: 'orange' },
  churned: { label: 'Perdido', color: 'red' },
  proposal: { label: 'Propuesta', color: 'blue' },
  paused: { label: 'Pausado', color: 'gray' },
};

export function ClientCard({ client, onClick }: { client: Client; onClick?: () => void }) {
  const status = STATUS[client.status];
  return (
    <Card onClick={onClick} className="flex items-center gap-3">
      <Avatar name={client.name} color={client.custom_color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ios-text">{client.name}</p>
          <Pill color={status.color}>{status.label}</Pill>
        </div>
        <p className="truncate text-xs text-ios-text-3">{client.industry ?? 'Sin industria'}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-ios-text">{formatCurrency(client.monthly_fee)}</p>
        <p className="text-[10px] text-ios-text-3">/mes</p>
      </div>
    </Card>
  );
}
