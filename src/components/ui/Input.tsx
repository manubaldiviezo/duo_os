import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-ios-text-2">
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl bg-ios-bg px-4 py-3 text-base text-ios-text outline-none',
          'placeholder:text-ios-text-3 focus:ring-2 focus:ring-brand/40',
          className
        )}
        {...props}
      />
    </div>
  );
}
