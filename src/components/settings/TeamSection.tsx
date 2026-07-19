import { useCallback, useEffect, useState } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconBrandWhatsapp, IconCopy } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import type { TeamMember } from '@/types/app.types';

export function TeamSection() {
  const user = useAuthStore((s) => s.user);
  const toast = useUIStore((s) => s.toast);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setMembers((data as TeamMember[]) ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setName('');
    setEmail('');
    setRole('');
    setAdding(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setName(m.name);
    setEmail(m.email ?? '');
    setRole(m.role ?? '');
    setAdding(true);
  }

  function closeForm() {
    setAdding(false);
    setEditing(null);
  }

  async function save() {
    if (!user || !name.trim()) {
      toast('Escribe al menos el nombre', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      email: email.trim() || null,
      role: role.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('team_members').update(payload).eq('id', editing.id)
      : await supabase.from('team_members').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(editing ? 'Miembro actualizado' : 'Miembro agregado', 'success');
    closeForm();
    load();
  }

  async function remove(m: TeamMember) {
    await supabase.from('team_members').delete().eq('id', m.id);
    toast('Miembro eliminado', 'success');
    load();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ios-text-2">Equipo</h2>
        {!adding && (
          <button
            onClick={openNew}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"
            aria-label="Agregar miembro"
          >
            <IconPlus size={18} />
          </button>
        )}
      </div>

      {members.length === 0 && !adding && (
        <p className="text-sm text-ios-text-3">
          Agrega a tu equipo para poder asignarles tareas y notificarles por correo.
        </p>
      )}

      {members.map((m) => {
        const joined = Boolean(m.member_user_id);
        const inviteMsg = `Hola ${m.name} 👋 Te invito a nuestro equipo en DUO Community.\n1) Entrá a https://duocommunity.lat y creá tu cuenta\n2) Ingresá este código de equipo: ${m.invite_code}\n¡Ahí vas a ver tus tareas, tu XP y tus retos! 💪`;
        return (
          <div key={m.id} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ios-text">{m.name}</p>
                <p className="truncate text-xs text-ios-text-3">
                  {[m.role, m.email].filter(Boolean).join(' · ') || 'Sin datos'}
                </p>
              </div>
              <button onClick={() => openEdit(m)} className="text-ios-text-3">
                <IconEdit size={18} />
              </button>
              <button onClick={() => remove(m)} className="text-ios-red">
                <IconTrash size={18} />
              </button>
            </div>
            <div className="ml-12 flex items-center gap-2">
              {joined ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                  style={{ background: 'var(--ok-l)', color: 'var(--ok-d)' }}
                >
                  ✓ en el equipo — ve sus tareas en la app
                </span>
              ) : (
                <>
                  <span className="rounded-lg bg-ios-bg px-2.5 py-1 font-mono text-xs font-extrabold tracking-widest text-ios-text">
                    {m.invite_code}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(m.invite_code ?? '');
                      toast('Código copiado', 'success');
                    }}
                    className="text-ios-text-3"
                    aria-label="Copiar código"
                  >
                    <IconCopy size={16} />
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                    style={{ background: 'var(--ok-l)', color: 'var(--ok-d)' }}
                  >
                    <IconBrandWhatsapp size={13} /> invitar
                  </a>
                </>
              )}
            </div>
          </div>
        );
      })}

      {adding && (
        <div className="space-y-2 rounded-xl bg-ios-bg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ios-text-2">
              {editing ? 'Editar miembro' : 'Nuevo miembro'}
            </span>
            <button onClick={closeForm} className="text-ios-text-3">
              <IconX size={16} />
            </button>
          </div>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Correo (para notificaciones)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input placeholder="Puesto (ej. Diseñador)" value={role} onChange={(e) => setRole(e.target.value)} />
          <Button size="sm" className="w-full" loading={saving} onClick={save}>
            {editing ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
      )}
    </Card>
  );
}
