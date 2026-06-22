export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-ios-text-3"
          style={{ animation: 'bounce-dot 1.4s ease-in-out infinite', animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}
