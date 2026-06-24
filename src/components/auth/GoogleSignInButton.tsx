import { IconBrandGoogle } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/stores/uiStore';

export function GoogleSignInButton({ label = 'Continuar con Google' }: { label?: string }) {
  const toast = useUIStore((s) => s.toast);

  async function go() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) toast(error.message, 'error');
  }

  return (
    <button
      onClick={go}
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-ios-sep bg-white py-3 text-sm font-semibold text-[#1c1c1e] transition active:scale-[0.98]"
    >
      <IconBrandGoogle size={20} />
      {label}
    </button>
  );
}
