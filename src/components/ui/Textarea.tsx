import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-ios-text-2">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={cn(
          'w-full resize-none rounded-xl bg-ios-bg px-4 py-3 text-sm text-ios-text outline-none',
          'placeholder:text-ios-text-3 focus:ring-2 focus:ring-brand/40',
          className
        )}
        {...props}
      />
    </div>
  );
}
