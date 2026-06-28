import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconCheck, IconBrandWhatsapp } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { PLANS, CYCLES, cyclePrice, buyUrl, type Cycle, type Plan } from '@/lib/plans';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatCurrency } from '@/lib/utils';

export function Plans() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const [cycle, setCycle] = useState<Cycle>(CYCLES[0]);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const currentPlan = (profile?.plan ?? 'free') as Plan;
  const paid: Plan[] = ['pro', 'premium'];

  async function redeem() {
    if (!user || !code.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc('redeem_access_code', { p_code: code.trim() });
    setRedeeming(false);
    if (error || !data || data === 'invalid') {
      toast('Código inválido', 'error');
      return;
    }
    if (profile) setProfile({ ...profile, plan: data });
    toast(`¡Listo! Plan ${String(data).toUpperCase()} activado 🎉`, 'success');
    setCode('');
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center bg-ios-bg/80 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-ios">
        <button onClick={() => navigate(-1)} className="flex items-center text-brand">
          <IconChevronLeft size={24} />
          <span className="text-sm">Atrás</span>
        </button>
      </header>

      <div className="space-y-5 px-5 pt-2">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ios-text">Planes</h1>
          <p className="mt-1 text-sm text-ios-text-3">
            Tu plan actual: <span className="font-semibold text-brand">{PLANS[currentPlan].name}</span>
          </p>
        </div>

        {/* Ciclo de facturación */}
        <div className="flex justify-center gap-2">
          {CYCLES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCycle(c)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                cycle.key === c.key ? 'bg-brand text-white' : 'bg-ios-card text-ios-text-2'
              )}
            >
              {c.label}
              {c.discount > 0 && <span className="ml-1 text-[10px]">-{Math.round(c.discount * 100)}%</span>}
            </button>
          ))}
        </div>

        {/* Free */}
        <Card className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-ios-text">Free</h2>
            <span className="text-sm text-ios-text-3">21 días</span>
          </div>
          <ul className="space-y-1">
            {PLANS.free.perks.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-ios-text-2">
                <IconCheck size={15} className="text-ios-green" /> {p}
              </li>
            ))}
          </ul>
        </Card>

        {/* Pro / Premium */}
        {paid.map((id) => {
          const plan = PLANS[id];
          const total = cyclePrice(plan.priceMonthly, cycle);
          const perMonth = Math.round(total / cycle.months);
          return (
            <Card key={id} className={cn('space-y-3', id === 'premium' && 'border border-brand/40')}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-ios-text">{plan.name}</h2>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-ios-text">{formatCurrency(perMonth)}<span className="text-sm font-normal text-ios-text-3">/mes</span></div>
                  {cycle.months > 1 && (
                    <div className="text-[11px] text-ios-text-3">{formatCurrency(total)} cada {cycle.months} meses</div>
                  )}
                </div>
              </div>
              <ul className="space-y-1">
                {plan.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-ios-text-2">
                    <IconCheck size={15} className="text-ios-green" /> {p}
                  </li>
                ))}
              </ul>
              <a href={buyUrl(plan.name, cycle)} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">
                  <span className="flex items-center justify-center gap-2">
                    <IconBrandWhatsapp size={18} /> Comprar {plan.name}
                  </span>
                </Button>
              </a>
            </Card>
          );
        })}

        {/* Canjear código */}
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-ios-text-2">¿Tienes un código de acceso?</h2>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ingresa tu código de acceso" />
            <Button loading={redeeming} onClick={redeem}>
              Canjear
            </Button>
          </div>
        </Card>

        <p className="pb-6 text-center text-[11px] text-ios-text-3">
          La compra te contacta por WhatsApp. La activación es con código de acceso.
        </p>
      </div>
    </div>
  );
}
