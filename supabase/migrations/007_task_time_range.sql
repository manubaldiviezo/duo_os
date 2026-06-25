-- ============================================
-- DUO Community — Rango de tiempo opcional en tareas
-- ============================================
-- Hora/fecha de fin opcional (para tareas con rango de tiempo).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_end TIMESTAMPTZ;
