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
        'rounded-xl font-medium transition-all active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-d',
        variant === 'secondary' && 'bg-brand-l text-brand-d',
        variant === 'ghost' && 'bg-transparent text-ios-text-2 hover:bg-ios-bg',
        variant === 'destructive' && 'bg-ios-red text-white',
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
