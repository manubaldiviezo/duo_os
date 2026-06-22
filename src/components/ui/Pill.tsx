import { cn } from '@/lib/utils';

type PillColor = 'gray' | 'purple' | 'green' | 'orange' | 'red' | 'blue';

const COLORS: Record<PillColor, string> = {
  gray: 'bg-ios-text-3/15 text-ios-text-2',
  purple: 'bg-brand-l text-brand-d',
  green: 'bg-ios-green/15 text-ios-green',
  orange: 'bg-ios-orange/15 text-ios-orange',
  red: 'bg-ios-red/15 text-ios-red',
  blue: 'bg-ios-blue/15 text-ios-blue',
};

interface PillProps {
  children: React.ReactNode;
  color?: PillColor;
  className?: string;
}

export function Pill({ children, color = 'gray', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        COLORS[color],
        className
      )}
    >
      {children}
    </span>
  );
}
