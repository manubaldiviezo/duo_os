import { colorFromString, initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string | null;
}

export function Avatar({ name, size = 40, color }: AvatarProps) {
  const bg = color ?? colorFromString(name);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
