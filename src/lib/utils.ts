import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#7F77DD',
  '#FF9500',
  '#34C759',
  '#007AFF',
  '#AF52DE',
  '#FF2D55',
  '#FF3B30',
  '#5856D6',
];

export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

/**
 * Aclara (amount > 0) u oscurece (amount < 0) un color hex.
 * amount va de -1 (negro) a 1 (blanco).
 */
export function shadeColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((x) => x + x).join('') : clean;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const a = 1 + amount;
    r = Math.round(r * a);
    g = Math.round(g * a);
    b = Math.round(b * a);
  }
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

/** Aplica el color de marca a las variables CSS para que afecte toda la app. */
export function applyBrandColor(hex?: string | null): void {
  if (!hex) return;
  const root = document.documentElement;
  root.style.setProperty('--brand', hex);
  root.style.setProperty('--brand-d', shadeColor(hex, -0.25));
  root.style.setProperty('--brand-l', shadeColor(hex, 0.85));
}

export const FONT_STACKS: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  montserrat: "'Montserrat', sans-serif",
};

/** Aplica color primario, secundario y tipografía del perfil a toda la app. */
export function applyTheme(opts: {
  brand_color?: string | null;
  brand_color_secondary?: string | null;
  font_family?: string | null;
}): void {
  const root = document.documentElement;
  const c = opts.brand_color;
  // El morado original (#7F77DD) se trata como "sin elegir" -> naranja de marca.
  const brand = !c || c.toLowerCase() === '#7f77dd' ? '#F2741B' : c;
  root.style.setProperty('--brand', brand);
  root.style.setProperty('--brand-d', shadeColor(brand, -0.25));
  root.style.setProperty('--brand-l', shadeColor(brand, 0.85));
  if (opts.brand_color_secondary) root.style.setProperty('--brand-2', opts.brand_color_secondary);
  root.style.setProperty('--font-sans', FONT_STACKS[opts.font_family ?? 'system'] ?? FONT_STACKS.system);
}
