import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';
import { useUIStore, type ToastItem } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), 3200);
    return () => clearTimeout(t);
  }, [item.id, dismiss]);

  const Icon =
    item.variant === 'success' ? IconCheck : item.variant === 'error' ? IconX : IconInfoCircle;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => dismiss(item.id)}
      className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ios-card px-4 py-3 shadow-lg"
    >
      <Icon
        size={18}
        className={cn(
          item.variant === 'success' && 'text-ios-green',
          item.variant === 'error' && 'text-ios-red',
          item.variant === 'info' && 'text-ios-blue'
        )}
      />
      <span className="text-sm font-medium text-ios-text">{item.message}</span>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[90%] max-w-sm -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastRow key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
