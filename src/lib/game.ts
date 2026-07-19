import type { Task, TeamMember } from '@/types/app.types';

/* ============================================================
   Sistema de juego DUO — XP, rachas, metas e insignias.
   El XP se CALCULA de las tareas reales (no requiere migración):
   pondera dificultad (prioridad) y puntualidad.
   ============================================================ */

export function xpForTask(task: Pick<Task, 'priority'>): number {
  return task.priority === 'high' ? 60 : task.priority === 'low' ? 30 : 45;
}

/** Bonus si se completó antes (o sin) fecha límite. */
export function completedOnTime(task: Task): boolean {
  if (!task.completed_at) return false;
  if (!task.due_date) return true;
  return new Date(task.completed_at).getTime() <= new Date(task.due_date).getTime() + 60_000;
}

export function taskXPEarned(task: Task): number {
  const base = xpForTask(task);
  return completedOnTime(task) ? base + 15 : base;
}

export interface MemberStats {
  memberId: string | null; // null = el dueño
  name: string;
  xpMonth: number;
  doneMonth: number;
  onTimeMonth: number;
  missedMonth: number; // vencidas sin completar
  streakDays: number; // días consecutivos (hasta hoy/ayer) con al menos 1 completada
  level: number;
  xpTotal: number;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function levelFromXP(xp: number): number {
  // Curva suave: nivel 1 -> 0, cada nivel pide ~120 XP más que el anterior.
  return Math.max(1, Math.floor((Math.sqrt(xp / 60) + 1) * 10) / 10 | 0) + Math.floor(Math.sqrt(xp / 120));
}

export function xpForNextLevel(xp: number): { level: number; into: number; needed: number } {
  const level = 1 + Math.floor(Math.sqrt(xp / 120));
  const base = 120 * (level - 1) * (level - 1);
  const next = 120 * level * level;
  return { level, into: xp - base, needed: next - base };
}

/** Calcula las estadísticas de juego por persona a partir de las tareas reales. */
export function computeStats(tasks: Task[], members: TeamMember[], ownerName: string): MemberStats[] {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const people: { id: string | null; name: string }[] = [
    { id: null, name: ownerName },
    ...members.map((m) => ({ id: m.id as string | null, name: m.name })),
  ];

  return people.map(({ id, name }) => {
    const mine = tasks.filter((t) => (t.assigned_member_id ?? null) === id);
    const doneAll = mine.filter((t) => t.status === 'done' && t.completed_at);
    const doneMonth = doneAll.filter((t) => new Date(t.completed_at as string).getTime() >= monthStart);
    const onTimeMonth = doneMonth.filter(completedOnTime);
    const missedMonth = mine.filter(
      (t) =>
        t.status !== 'done' &&
        t.due_date &&
        new Date(t.due_date).getTime() < now.getTime() &&
        new Date(t.due_date).getTime() >= monthStart
    );

    // Racha: días consecutivos con >=1 completada, contando desde hoy o ayer.
    const days = new Set(doneAll.map((t) => dayKey(new Date(t.completed_at as string))));
    let streak = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // permite que hoy aún no haya empezado
    while (days.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const xpTotal = doneAll.reduce((s, t) => s + taskXPEarned(t), 0);
    const xpMonth = doneMonth.reduce((s, t) => s + taskXPEarned(t), 0);

    return {
      memberId: id,
      name,
      xpMonth,
      doneMonth: doneMonth.length,
      onTimeMonth: onTimeMonth.length,
      missedMonth: missedMonth.length,
      streakDays: streak,
      level: xpForNextLevel(xpTotal).level,
      xpTotal,
    };
  });
}

/* ---------- celebración global (confetti + vibración) ---------- */

export interface CelebrateDetail {
  xp?: number;
  message?: string;
}

export function celebrate(detail: CelebrateDetail = {}): void {
  window.dispatchEvent(new CustomEvent<CelebrateDetail>('duo:celebrate', { detail }));
  if ('vibrate' in navigator) navigator.vibrate?.([30, 40, 30]);
}
