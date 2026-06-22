import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-ios-card rounded-2xl p-4 shadow-sm',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform',
        className
      )}
    >
      {children}
    </div>
  );
}
