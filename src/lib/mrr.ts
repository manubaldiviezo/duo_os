import { supabase } from './supabase';

export interface MRRResult {
  current: number;
  goal: number;
  gap: number;
  gapPercent: number;
  byClient: { name: string; amount: number }[];
}

export async function calculateMRR(userId: string): Promise<MRRResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('mrr_goal')
    .eq('id', userId)
    .single();

  const { data: clients } = await supabase
    .from('clients')
    .select('name, monthly_fee')
    .eq('user_id', userId)
    .in('status', ['active', 'at_risk']);

  const current = clients?.reduce((sum, c) => sum + Number(c.monthly_fee), 0) ?? 0;
  const goal = Number(profile?.mrr_goal ?? 3000);
  const gap = goal - current;
  const gapPercent = goal > 0 ? (gap / goal) * 100 : 0;

  return {
    current,
    goal,
    gap,
    gapPercent,
    byClient: clients?.map((c) => ({ name: c.name, amount: Number(c.monthly_fee) })) ?? [],
  };
}
