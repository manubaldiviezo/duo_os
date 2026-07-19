import { useEffect, useState } from 'react';
import type { CelebrateDetail } from '@/lib/game';

const COLORS = ['#f2741b', '#ffc933', '#58cc02', '#1cb0f6', '#9d5cf0', '#ff6b6b'];

interface Burst {
  id: number;
  xp?: number;
  message?: string;
}

/* Escucha el evento global 'duo:celebrate' y dispara confetti + chip de XP.
   Se monta una sola vez en App. */
export function CelebrationHost() {
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    function onCelebrate(e: Event) {
      const detail = (e as CustomEvent<CelebrateDetail>).detail ?? {};
      setBurst({ id: Date.now(), xp: detail.xp, message: detail.message });
      window.setTimeout(() => setBurst(null), 1400);
    }
    window.addEventListener('duo:celebrate', onCelebrate);
    return () => window.removeEventListener('duo:celebrate', onCelebrate);
  }, []);

  if (!burst) return null;

  return (
    <div className="confetti-layer" key={burst.id}>
      {Array.from({ length: 26 }).map((_, i) => (
        <span
          key={i}
          className="cpiece"
          style={{
            background: COLORS[i % COLORS.length],
            left: `${44 + Math.random() * 12}%`,
            top: '58%',
            ['--dx' as string]: `${(Math.random() - 0.5) * 320}px`,
            ['--dy' as string]: `${-90 - Math.random() * 260}px`,
            ['--rot' as string]: `${(Math.random() - 0.5) * 540}deg`,
            animationDelay: `${Math.random() * 0.12}s`,
          }}
        />
      ))}
      {(burst.xp || burst.message) && (
        <div
          className="fixed left-1/2 top-[46%] z-[95] -translate-x-1/2 rounded-full bg-ios-text px-5 py-2.5 text-sm font-extrabold text-white shadow-xl"
          style={{ animation: 'cfly-none 0s' }}
        >
          {burst.message ?? '¡Hecha!'}
          {burst.xp ? ` · +${burst.xp} XP` : ''}
        </div>
      )}
    </div>
  );
}
