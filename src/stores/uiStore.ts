import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface UIState {
  toasts: ToastItem[];
  toast: (message: string, variant?: ToastItem['variant']) => void;
  dismissToast: (id: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  toast: (message, variant = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now() + Math.random(), message, variant }],
    })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
