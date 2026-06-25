import { NavLink } from 'react-router-dom';
import {
  IconHome,
  IconChecklist,
  IconSparkles,
  IconUsers,
  IconChartBar,
  IconUser,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', icon: IconHome, label: 'Inicio' },
  { to: '/tareas', icon: IconChecklist, label: 'Tareas' },
  { to: '/ia', icon: IconSparkles, label: 'IA' },
  { to: '/clientes', icon: IconUsers, label: 'Clientes' },
  { to: '/finanzas', icon: IconChartBar, label: 'Finanzas' },
  { to: '/perfil', icon: IconUser, label: 'Perfil' },
];

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[84px] items-start border-t border-ios-sep bg-ios-card/90 pb-7 pt-2 backdrop-blur-ios md:hidden">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-1',
              isActive ? 'text-brand' : 'text-ios-text-3'
            )
          }
        >
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
