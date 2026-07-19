import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  IconHome,
  IconChecklist,
  IconMicrophone,
  IconUsers,
  IconChartBar,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/* 4 secciones + micrófono central: la IA es el corazón, no una pestaña más.
   Perfil se accede desde el avatar en Inicio; Reuniones desde su botón. */
const tabs = [
  { to: '/', icon: IconHome, label: 'Hoy' },
  { to: '/tareas', icon: IconChecklist, label: 'Tareas' },
  { to: '/clientes', icon: IconUsers, label: 'Clientes' },
  { to: '/finanzas', icon: IconChartBar, label: 'Dinero' },
];

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[84px] items-start border-t border-ios-sep bg-ios-card/90 pb-7 pt-2 backdrop-blur-ios md:hidden">
      <button
        className={cn('fab-mic', location.pathname === '/ia' && 'brightness-110')}
        onClick={() => navigate('/ia')}
        aria-label="Hablarle a DUO"
      >
        <IconMicrophone size={26} />
      </button>

      {tabs.map(({ to, icon: Icon, label }, i) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-1',
              i === 1 && 'mr-8',
              i === 2 && 'ml-8',
              isActive ? 'text-brand' : 'text-ios-text-3'
            )
          }
        >
          <Icon size={22} />
          <span className="text-[10px] font-bold">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
