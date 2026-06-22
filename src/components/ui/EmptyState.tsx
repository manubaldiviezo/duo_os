type TablerIcon = React.ComponentType<{ size?: number; className?: string }>;

interface EmptyStateProps {
  icon?: TablerIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: IconCmp, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {IconCmp && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-l">
          <IconCmp size={30} className="text-brand" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ios-text">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-ios-text-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
