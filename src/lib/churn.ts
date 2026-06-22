export interface ChurnFactors {
  daysSinceLastContact: number;
  pendingPaymentAmount: number;
  pendingPaymentDays: number;
  overdueTasksCount: number;
  averageOverdueDays: number;
  projectProgress: number;
  daysUntilProjectDue: number;
  contractMonthsActive: number;
}

export function calculateChurnScore(factors: ChurnFactors): number {
  let score = 0;

  // Falta de contacto (max 30 puntos)
  if (factors.daysSinceLastContact > 30) score += 30;
  else if (factors.daysSinceLastContact > 21) score += 25;
  else if (factors.daysSinceLastContact > 14) score += 15;
  else if (factors.daysSinceLastContact > 7) score += 5;

  // Pagos pendientes (max 25 puntos)
  if (factors.pendingPaymentDays > 30) score += 25;
  else if (factors.pendingPaymentDays > 14) score += 20;
  else if (factors.pendingPaymentDays > 7) score += 10;

  // Tareas vencidas (max 20 puntos)
  if (factors.overdueTasksCount >= 3) score += 20;
  else if (factors.overdueTasksCount === 2) score += 15;
  else if (factors.overdueTasksCount === 1) score += 8;

  // Avance bajo cerca de deadline (max 15 puntos)
  if (factors.projectProgress < 30 && factors.daysUntilProjectDue < 7) score += 15;
  else if (factors.projectProgress < 50 && factors.daysUntilProjectDue < 14) score += 10;

  // Cliente nuevo (riesgo extra los primeros meses, max 10)
  if (factors.contractMonthsActive < 3) score += 10;
  else if (factors.contractMonthsActive < 6) score += 5;

  return Math.min(score, 100);
}

export type ChurnRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function getChurnRiskLevel(score: number): ChurnRiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
