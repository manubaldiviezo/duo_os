interface TopBarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  leading?: React.ReactNode;
}

export function TopBar({ title, subtitle, right, leading }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-ios-bg/80 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-ios">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          {subtitle && <p className="text-sm text-ios-text-3">{subtitle}</p>}
          <h1 className="truncate text-[28px] font-bold leading-tight text-ios-text">{title}</h1>
        </div>
      </div>
      {right}
    </header>
  );
}
