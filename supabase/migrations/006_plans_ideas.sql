-- ============================================
-- DUO OS — Planes, códigos de acceso, uso de IA e Ideas
-- ============================================

-- Plan y uso de IA en el perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_messages_month INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_messages_reset DATE DEFAULT (date_trunc('month', NOW())::date);

-- Códigos de acceso (canje a Pro/Premium)
CREATE TABLE IF NOT EXISTS access_codes (
  code TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO access_codes (code, plan) VALUES ('APPDUO', 'pro') ON CONFLICT (code) DO NOTHING;
INSERT INTO access_codes (code, plan) VALUES ('DUOPREMIUM', 'premium') ON CONFLICT (code) DO NOTHING;

-- La tabla NO se expone a clientes (sin políticas + RLS on). Solo la función definer la lee.
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Canjear un código: asigna el plan al usuario actual. Devuelve el plan o 'invalid'.
CREATE OR REPLACE FUNCTION redeem_access_code(p_code TEXT)
RETURNS TEXT AS $$
DECLARE v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan FROM access_codes WHERE upper(code) = upper(trim(p_code)) AND active = true;
  IF v_plan IS NULL THEN RETURN 'invalid'; END IF;
  UPDATE profiles SET plan = v_plan WHERE id = auth.uid();
  RETURN v_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Incrementa el contador de mensajes de IA (resetea por mes). Devuelve el total del mes.
CREATE OR REPLACE FUNCTION bump_ai_usage()
RETURNS INT AS $$
DECLARE v_count INT; v_reset DATE; v_month DATE := date_trunc('month', NOW())::date;
BEGIN
  SELECT ai_messages_month, ai_messages_reset INTO v_count, v_reset FROM profiles WHERE id = auth.uid();
  IF v_reset IS NULL OR v_reset < v_month THEN
    v_count := 0;
  END IF;
  v_count := COALESCE(v_count, 0) + 1;
  UPDATE profiles SET ai_messages_month = v_count, ai_messages_reset = v_month WHERE id = auth.uid();
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ideas (texto / voz) — espacio creativo del dueño
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id, created_at DESC);
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own ideas" ON ideas;
CREATE POLICY "Users see own ideas" ON ideas FOR ALL USING (auth.uid() = user_id);
