export type Plan = 'free' | 'pro' | 'premium';

export interface PlanDef {
  id: Plan;
  name: string;
  priceMonthly: number;
  aiMessagesPerMonth: number;
  savedChats: number;
  integrations: boolean;
  perks: string[];
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    aiMessagesPerMonth: 40,
    savedChats: 5,
    integrations: false,
    perks: ['Prueba de 21 días', '40 mensajes de IA/mes', 'Tareas, clientes y finanzas', 'Sin integraciones'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 7,
    aiMessagesPerMonth: 1000,
    savedChats: 50,
    integrations: true,
    perks: ['1.000 mensajes de IA/mes', 'Recordatorios por email', 'Integraciones (Calendar, etc.)', 'Equipo y delegación'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 17,
    aiMessagesPerMonth: 10000,
    savedChats: 200,
    integrations: true,
    perks: ['IA sin límites prácticos', 'Todas las integraciones', 'Reportes automáticos', 'Soporte prioritario'],
  },
};

export const FREE_TRIAL_DAYS = 21;
export const WHATSAPP = '59175175144';

export interface Cycle {
  key: string;
  label: string;
  months: number;
  discount: number; // 0..1
}

export const CYCLES: Cycle[] = [
  { key: 'mensual', label: 'Mensual', months: 1, discount: 0 },
  { key: 'semestral', label: 'Semestral', months: 6, discount: 0.25 },
  { key: 'anual', label: 'Anual', months: 12, discount: 0.4 },
];

export function cyclePrice(monthly: number, cycle: Cycle): number {
  return Math.round(monthly * cycle.months * (1 - cycle.discount));
}

export function buyUrl(planName: string, cycle: Cycle): string {
  const price = '';
  const msg = `Hola! Quiero contratar el plan ${planName} (${cycle.label}) de DUO OS.${price}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

/** ¿El plan free ya venció su prueba de 21 días? */
export function isFreeExpired(plan: Plan, startedAt?: string | null): boolean {
  if (plan !== 'free' || !startedAt) return false;
  const days = (Date.now() - new Date(startedAt).getTime()) / 86400000;
  return days > FREE_TRIAL_DAYS;
}
