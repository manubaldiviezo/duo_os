interface LogoProps {
  size?: number;
  className?: string;
}

/** Isotipo de DUO: la "Ú" naranja con pixeles, sobre fondo transparente. */
export function Logo({ size = 64, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DUO"
    >
      <defs>
        <linearGradient id="duoGrad" x1="40" y1="18" x2="60" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8AC1F" />
          <stop offset="1" stopColor="#F26B1E" />
        </linearGradient>
      </defs>
      {/* U */}
      <path
        d="M34 40 V57 a16 16 0 0 0 32 0 V40"
        stroke="url(#duoGrad)"
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* píxeles (efecto digital) */}
      <rect x="21" y="20" width="10.5" height="10.5" rx="1.5" fill="#F8AC1F" />
      <rect x="31" y="30" width="10.5" height="10.5" rx="1.5" fill="#F4881E" />
      <rect x="58.5" y="20" width="10.5" height="10.5" rx="1.5" fill="#F26B1E" />
      <rect x="58.5" y="30" width="10.5" height="10.5" rx="1.5" fill="#F4881E" />
    </svg>
  );
}
