import { NavLink } from 'react-router-dom';
import {
  IconHome,
  IconChecklist,
  IconSparkles,
  IconUsers,
  IconChartBar,
  IconUser,
  IconCalendarEvent,
  IconTrophy,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', icon: IconHome, label: 'Inicio' },
  { to: '/tareas', icon: IconChecklist, label: 'Tareas' },
  { to: '/ia', icon: IconSparkles, label: 'Asistente IA' },
  { to: '/reuniones', icon: IconCalendarEvent, label: 'Reuniones' },
  { to: '/progreso', icon: IconTrophy, label: 'Progreso' },
  { to: '/clientes', icon: IconUsers, label: 'Clientes' },
  { to: '/finanzas', icon: IconChartBar, label: 'Finanzas' },
  { to: '/perfil', icon: IconUser, label: 'Perfil' },
];

/** Navegación lateral para escritorio (oculta en móvil). */
export function Sidebar() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ios-sep bg-ios-card/60 px-4 py-6 backdrop-blur-ios md:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        {profile?.logo_url ? (
          <img src={profile.logo_url} alt="Logo" className="h-9 w-9 rounded-xl object-contain" />
        ) : (
          <Logo size={36} />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ios-text">{profile?.agency_name ?? 'DUO Community'}</p>
          <p className="text-[11px] text-ios-text-3">con IA</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand text-white' : 'text-ios-text-2 hover:bg-ios-bg'
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="px-2 text-[10px] leading-relaxed text-ios-text-3">
        © {new Date().getFullYear()} DUO · Bolivia
      </p>
    </aside>
  );
}
