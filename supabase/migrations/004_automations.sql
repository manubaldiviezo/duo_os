-- ============================================
-- DUO OS — Bloque 4: Automatizaciones
-- ============================================

-- Evita reenviar el mismo recordatorio de tarea
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- ============================================
-- Tareas recurrentes automáticas al dar de alta un cliente con fee > 0.
-- Cubre cualquier vía de creación (formulario o asistente IA).
-- ============================================
CREATE OR REPLACE FUNCTION create_default_client_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.monthly_fee > 0 THEN
    INSERT INTO tasks (user_id, client_id, title, category, priority, due_date, created_via)
    VALUES
      (NEW.user_id, NEW.id, 'Planificar contenido del mes - ' || NEW.name, 'content', 'medium',
        date_trunc('month', NOW()) + INTERVAL '4 days', 'recurring'),
      (NEW.user_id, NEW.id, 'Reunión de seguimiento - ' || NEW.name, 'meeting', 'medium',
        date_trunc('month', NOW()) + INTERVAL '14 days', 'recurring'),
      (NEW.user_id, NEW.id, 'Reporte mensual - ' || NEW.name, 'reports', 'high',
        date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '2 days', 'recurring');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_client_created_default_tasks ON clients;
CREATE TRIGGER on_client_created_default_tasks
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION create_default_client_tasks();
