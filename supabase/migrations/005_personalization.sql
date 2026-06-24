-- ============================================
-- DUO OS — Personalización avanzada
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT DEFAULT '#FFB037';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system';
-- logo_url ya existe en profiles.

-- NOTA: para el logo se usa Supabase Storage. Crea (una vez) un bucket PÚBLICO
-- llamado "logos" desde el panel: Storage -> New bucket -> name: logos -> Public.
