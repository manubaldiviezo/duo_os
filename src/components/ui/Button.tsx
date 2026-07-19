import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Botones "con cuerpo": profundidad que invita a tocar (estilo Duolingo).
        'rounded-2xl font-extrabold transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:active:translate-y-0',
        variant === 'primary' && 'bg-brand text-white shadow-[0_4px_0_var(--brand-d)] hover:brightness-105',
        variant === 'secondary' && 'bg-brand-l text-brand-d shadow-[0_3px_0_var(--ios-sep)]',
        variant === 'ghost' && 'bg-transparent font-bold text-ios-text-2 hover:bg-ios-bg',
        variant === 'destructive' && 'bg-ios-red text-white shadow-[0_4px_0_#c72c23]',
        size === 'sm' && 'px-3 py-2 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? '…' : children}
    </button>
  );
}
