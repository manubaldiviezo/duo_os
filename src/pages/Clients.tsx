import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconUsers } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { TopBar } from '@/components/layout/TopBar';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientForm } from '@/components/clients/ClientForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { Button } from '@/components/ui/Button';
import type { Client } from '@/types/app.types';

export function Clients() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('monthly_fee', { ascending: false });
    setClients((data as Client[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const totalMrr = clients
    .filter((c) => c.status === 'active' || c.status === 'at_risk')
    .reduce((s, c) => s + Number(c.monthly_fee), 0);

  return (
    <div>
      <TopBar
        title="Clientes"
        subtitle={`${clients.length} · ${formatCurrency(totalMrr)}/mes`}
        right={
          <button
            onClick={() => setShowForm(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white"
          >
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="mt-3 px-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingDots />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={IconUsers}
            title="Sin clientes"
            description="Agrega tu primer cliente para empezar."
            action={<Button onClick={() => setShowForm(true)}>Agregar cliente</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {clients.map((c) => (
              <ClientCard key={c.id} client={c} onClick={() => navigate(`/clientes/${c.id}`)} />
            ))}
          </div>
        )}
      </div>

      <ClientForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} />
    </div>
  );
}
