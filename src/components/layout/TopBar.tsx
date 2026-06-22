interface TopBarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-ios-bg/80 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-ios">
      <div>
        {subtitle && <p className="text-sm text-ios-text-3">{subtitle}</p>}
        <h1 className="text-[28px] font-bold leading-tight text-ios-text">{title}</h1>
      </div>
      {right}
    </header>
  );
}
