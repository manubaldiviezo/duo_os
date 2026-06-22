-- ============================================
-- SEED OPCIONAL — datos reales de Agencia DUO (Emanuel)
-- Ejecutar DESPUÉS de registrarte. Reemplaza 'USER_UUID' por tu id real
-- (lo encuentras en Authentication -> Users en Supabase).
-- ============================================
DO $$
DECLARE
  uid UUID := 'USER_UUID'; -- <-- REEMPLAZAR
BEGIN
  UPDATE profiles SET
    agency_name = 'Agencia DUO',
    user_name = 'Emanuel',
    user_role = 'CEO',
    brand_color = '#7F77DD',
    timezone = 'America/La_Paz',
    currency = 'USD',
    mrr_goal = 3000,
    onboarding_completed = true
  WHERE id = uid;

  INSERT INTO clients (user_id, name, industry, monthly_fee, status, services) VALUES
  (uid, 'Femmeninas', 'Moda/Femenino', 800, 'active', ARRAY['estrategia', 'contenido', 'meta_ads']),
  (uid, 'Chocolate Éxtasis', 'Gastronomía', 200, 'active', ARRAY['contenido', 'meta_ads']),
  (uid, 'VisionArq', 'Arquitectura', 200, 'active', ARRAY['contenido', 'estrategia']),
  (uid, 'Jimmy Durán', 'Personal Brand', 350, 'active', ARRAY['estrategia', 'contenido', 'meta_ads']),
  (uid, 'Rennacer Insumos', 'Insumos B2B', 250, 'active', ARRAY['estrategia', 'contenido', 'reportes']),
  (uid, 'Aloha Mental', 'Salud Mental', 50, 'active', ARRAY['contenido']),
  (uid, 'Odontología', 'Salud Dental', 70, 'active', ARRAY['contenido', 'meta_ads']),
  (uid, 'ProgamingEC', 'Gaming/Educación', 150, 'active', ARRAY['estrategia', 'contenido']),
  (uid, 'Climere', 'Por definir', 50, 'active', ARRAY['contenido']);

  INSERT INTO transactions (user_id, client_id, type, amount, description, category, date, is_recurring, recurring_day)
  SELECT uid, id, 'pending_income', monthly_fee, 'Mensualidad - ' || name, 'mensualidad', CURRENT_DATE, true, 1
  FROM clients WHERE user_id = uid;
END $$;
