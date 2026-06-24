interface LogoProps {
  size?: number;
  className?: string;
}

/** Isotipo de DUO Community (usa el ícono real de /public, redondeado). */
export function Logo({ size = 64, className }: LogoProps) {
  return (
    <img
      src="/icon-512.png"
      width={size}
      height={size}
      alt="DUO Community"
      className={className}
      style={{ borderRadius: Math.round(size * 0.22), display: 'block' }}
    />
  );
}
