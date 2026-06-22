import { create } from 'zustand';
import type { ChatMessage } from '@/types/app.types';

interface AIState {
  messages: ChatMessage[];
  thinking: boolean;
  addMessage: (msg: ChatMessage) => void;
  setThinking: (thinking: boolean) => void;
  clear: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  messages: [],
  thinking: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setThinking: (thinking) => set({ thinking }),
  clear: () => set({ messages: [] }),
}));
