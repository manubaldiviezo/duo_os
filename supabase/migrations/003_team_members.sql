-- ============================================
-- DUO OS — Bloque 1: Equipo / contactos
-- Ejecutar en Supabase SQL Editor (o supabase db push)
-- ============================================

-- Miembros del equipo (contactos que reciben emails; aún sin login propio)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own team" ON team_members;
CREATE POLICY "Users see own team" ON team_members
  FOR ALL USING (auth.uid() = user_id);

-- Permitir asignar una tarea a un miembro del equipo
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
