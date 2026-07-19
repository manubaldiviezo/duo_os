import { useEffect, useState } from 'react';
import { IconFlame, IconTrophy, IconAlertTriangle } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { computeStats, xpForNextLevel, type MemberStats } from '@/lib/game';
import type { Task, TeamMember } from '@/types/app.types';

/* Meta mensual por persona (tareas a tiempo). Configurable por agencia en la
   siguiente fase (columna en profiles); por ahora un objetivo sano por defecto. */
const META_MENSUAL = 30;

function MemberCard({ s }: { s: MemberStats }) {
  const lvl = xpForNextLevel(s.xpTotal);
  const metaPct = Math.min(100, Math.round((s.onTimeMonth / META_MENSUAL) * 100));

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-ios-text">{s.name}</p>
          <p className="text-xs font-semibold text-ios-text-2">
            Nivel {lvl.level} · {s.xpTotal.toLocaleString('es-BO')} XP
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
          style={{ background: 'var(--gold-l)', color: 'var(--gold-d)' }}
        >
          <IconFlame size={13} /> {s.streakDays} {s.streakDays === 1 ? 'día' : 'días'}
        </span>
      </div>

      {/* XP hacia el siguiente nivel */}
      <div>
        <div className="h-2.5 overflow-hidden rounded-full bg-ios-bg">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.round((lvl.into / lvl.needed) * 100))}%`,
              background: 'linear-gradient(90deg, var(--gold), #ffc933)',
            }}
          />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-ios-text-3">
          {lvl.needed - lvl.into} XP para nivel {lvl.level + 1}
        </p>
      </div>

      {/* Meta del mes */}
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-bold text-ios-text-2">Meta del mes</p>
          <p className="text-xs font-extrabold text-ios-text">
            {s.onTimeMonth} / {META_MENSUAL} a tiempo
          </p>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ios-bg">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${metaPct}%` }}
          />
        </div>
      </div>

      {/* Alertas e insignias */}
      <div className="flex flex-wrap gap-1.5">
        {s.missedMonth > 0 && (
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            style={{ background: 'var(--bad-l)', color: 'var(--bad)' }}
          >
            <IconAlertTriangle size={12} /> {s.missedMonth} vencida{s.missedMonth > 1 ? 's' : ''}
          </span>
        )}
        {s.streakDays >= 7 && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            style={{ background: 'var(--gold-l)', color: 'var(--gold-d)' }}
          >
            🔥 Racha 7+
          </span>
        )}
        {s.onTimeMonth >= META_MENSUAL && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            style={{ background: 'var(--ok-l)', color: 'var(--ok-d)' }}
          >
            🏅 ¡Meta cumplida!
          </span>
        )}
        {s.doneMonth === 0 && s.missedMonth === 0 && (
          <span className="rounded-full bg-ios-bg px-2.5 py-1 text-[11px] font-semibold text-ios-text-3">
            sin actividad este mes
          </span>
        )}
      </div>
    </Card>
  );
}

export function Progress() {
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [tasksRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('team_members').select('*').eq('user_id', user.id),
      ]);
      const tasks = (tasksRes.data as Task[]) ?? [];
      const members = (membersRes.data as TeamMember[]) ?? [];
      const all = computeStats(tasks, members, profile?.user_name ?? 'Tú');
      // Orden: más XP del mes primero.
      all.sort((a, b) => b.xpMonth - a.xpMonth);
      setStats(all);
      setLoading(false);
    })();
  }, [user, profile?.user_name]);

  const totalMes = stats.reduce((s, m) => s + m.xpMonth, 0);

  return (
    <div className="space-y-5 pb-8">
      <TopBar title="Progreso" subtitle="Retos del equipo · ganar-ganar" />
      <div className="space-y-4 px-5">
        <Card className="flex items-center gap-3" style={{ background: 'var(--gold-l)', borderColor: '#f3dfa4' }}>
          <IconTrophy size={28} style={{ color: 'var(--gold-d)' }} />
          <div>
            <p className="text-lg font-extrabold" style={{ color: 'var(--gold-d)' }}>
              {totalMes.toLocaleString('es-BO')} XP del equipo este mes
            </p>
            <p className="text-xs font-semibold text-ios-text-2">
              Cada tarea cumplida suma para todos · 30–60 XP según el reto · +15 por puntualidad
            </p>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingDots />
          </div>
        ) : (
          stats.map((s) => <MemberCard key={s.memberId ?? 'owner'} s={s} />)
        )}

        <p className="px-1 text-center text-xs font-semibold text-ios-text-3">
          Mientras el equipo gana retos y bonos, la agencia crece y llegan más clientes: ganar-ganar.
          Próximamente: bonificaciones configurables (dinero, día libre) y liga por equipos.
        </p>
      </div>
    </div>
  );
}
