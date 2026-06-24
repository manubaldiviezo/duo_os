interface LogoProps {
  size?: number;
  className?: string;
}

/** Isotipo de DUO: la "Ú" naranja con píxeles, fondo transparente. */
export function Logo({ size = 64, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DUO"
    >
      <defs>
        <linearGradient id="duoGrad" x1="40" y1="26" x2="66" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8AC1F" />
          <stop offset="1" stopColor="#F26B1E" />
        </linearGradient>
      </defs>
      {/* U */}
      <path d="M44 52 V66 a11 11 0 0 0 22 0 V52" stroke="url(#duoGrad)" strokeWidth="13" strokeLinecap="round" />
      {/* píxeles */}
      <rect x="28" y="28" width="11" height="11" rx="1.5" fill="#F8AC1F" />
      <rect x="38.5" y="39" width="11" height="11" rx="1.5" fill="#F4881E" />
      <rect x="60.5" y="28" width="11" height="11" rx="1.5" fill="#F26B1E" />
      <rect x="60.5" y="39" width="11" height="11" rx="1.5" fill="#F4881E" />
    </svg>
  );
}
