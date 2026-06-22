import { supabase } from './supabase';

export interface DetectedPattern {
  type: string;
  client_id: string;
  client_name: string;
  description: string;
  suggestion: string;
}

export async function detectPatterns(userId: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  const { data, error } = await supabase.rpc('count_overdue_by_client_last_4_weeks', {
    p_user_id: userId,
  });

  if (error) return patterns;

  for (const row of (data as any[]) ?? []) {
    if (row.weeks_with_overdue >= 3) {
      patterns.push({
        type: 'recurring_delays',
        client_id: row.client_id,
        client_name: row.client_name,
        description: `Llevas ${row.weeks_with_overdue} semanas seguidas atrasándote con ${row.client_name}`,
        suggestion: 'Tres opciones: bajar el alcance, subir el precio, o delegar',
      });
    }
  }

  return patterns;
}
