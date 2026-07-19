-- ============================================
-- DUO — Modo equipos: miembros con login propio vía código de invitación
-- ============================================

-- Código de invitación por miembro + vínculo con su cuenta real
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE
  DEFAULT upper(substr(md5(random()::text), 1, 6));
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS member_user_id UUID REFERENCES auth.users(id);

UPDATE team_members SET invite_code = upper(substr(md5(random()::text), 1, 6))
  WHERE invite_code IS NULL;

-- El perfil de un miembro apunta al workspace (dueño) al que pertenece
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_owner_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_id UUID;

-- Unirse a un equipo con el código (SECURITY DEFINER: valida y vincula).
CREATE OR REPLACE FUNCTION join_team(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  tm RECORD;
  agency TEXT;
BEGIN
  SELECT * INTO tm FROM team_members
    WHERE upper(invite_code) = upper(trim(p_code))
      AND (member_user_id IS NULL OR member_user_id = auth.uid())
    LIMIT 1;
  IF tm IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido o ya usado');
  END IF;

  UPDATE team_members SET member_user_id = auth.uid() WHERE id = tm.id;
  UPDATE profiles SET linked_owner_id = tm.user_id, member_id = tm.id,
    onboarding_completed = true
    WHERE id = auth.uid();

  SELECT agency_name INTO agency FROM profiles WHERE id = tm.user_id;
  RETURN jsonb_build_object('ok', true, 'agency', agency, 'member_name', tm.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: el miembro ve su propia fila del equipo
DROP POLICY IF EXISTS "Member sees own row" ON team_members;
CREATE POLICY "Member sees own row" ON team_members
  FOR SELECT USING (member_user_id = auth.uid());

-- RLS: el miembro ve y actualiza SOLO las tareas asignadas a él
DROP POLICY IF EXISTS "Member sees own tasks" ON tasks;
CREATE POLICY "Member sees own tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm
      WHERE tm.id = tasks.assigned_member_id AND tm.member_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Member updates own tasks" ON tasks;
CREATE POLICY "Member updates own tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm
      WHERE tm.id = tasks.assigned_member_id AND tm.member_user_id = auth.uid())
  );

-- RLS: el miembro puede leer los nombres de clientes del workspace (para sus tareas)
DROP POLICY IF EXISTS "Member reads workspace clients" ON clients;
CREATE POLICY "Member reads workspace clients" ON clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm
      WHERE tm.user_id = clients.user_id AND tm.member_user_id = auth.uid())
  );
