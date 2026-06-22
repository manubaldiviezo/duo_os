-- ============================================
-- DUO OS — Schema inicial completo
-- Ejecutar en Supabase SQL Editor (o vía CLI: supabase db push)
-- ============================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE client_status AS ENUM ('active', 'at_risk', 'churned', 'proposal', 'paused');
CREATE TYPE task_category AS ENUM ('strategy', 'content', 'ads', 'reports', 'design', 'meeting', 'admin', 'other');
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_source AS ENUM ('manual', 'voice', 'ai_suggestion', 'recurring');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'pending_income');
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'on_hold', 'done', 'cancelled');
CREATE TYPE insight_type AS ENUM ('churn_risk', 'pattern_detected', 'time_block_suggestion', 'morning_briefing', 'mrr_alert', 'opportunity');
CREATE TYPE insight_severity AS ENUM ('info', 'warning', 'critical');

-- 3. PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name TEXT NOT NULL DEFAULT 'Mi Agencia',
  user_name TEXT NOT NULL DEFAULT 'Usuario',
  user_role TEXT DEFAULT 'CEO',
  logo_url TEXT,
  brand_color TEXT DEFAULT '#7F77DD',
  brand_color_dark TEXT DEFAULT '#534AB7',
  brand_color_light TEXT DEFAULT '#EEEDFE',
  timezone TEXT DEFAULT 'America/La_Paz',
  currency TEXT DEFAULT 'USD',
  mrr_goal NUMERIC(10,2) DEFAULT 3000,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SETTINGS (definida antes para el trigger handle_new_user)
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notifications_enabled JSONB DEFAULT '{
    "overdue_tasks": true, "upcoming_meetings": true, "pending_payments": true,
    "daily_briefing": true, "client_alerts": true, "mrr_updates": true
  }'::jsonb,
  ai_features_enabled JSONB DEFAULT '{
    "morning_briefing": true, "churn_detection": true, "time_blocking": true,
    "pattern_detection": true, "voice_capture": true, "mrr_coaching": true
  }'::jsonb,
  briefing_time TIME DEFAULT '07:00:00',
  work_hours_start TIME DEFAULT '08:00:00',
  work_hours_end TIME DEFAULT '18:00:00',
  google_calendar_connected BOOLEAN DEFAULT false,
  google_refresh_token TEXT,
  google_access_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear profile + settings al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_name, agency_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'agency_name', 'Mi Agencia')
  );
  INSERT INTO public.settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. CLIENTS
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  status client_status DEFAULT 'active',
  services TEXT[] DEFAULT ARRAY[]::TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  contract_end_date DATE,
  last_contact_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  custom_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_status ON clients(user_id, status);

-- 5. PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'not_started',
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);

-- 6. TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category task_category DEFAULT 'other',
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  estimated_minutes INT,
  actual_minutes INT,
  created_via task_source DEFAULT 'manual',
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(user_id, due_date) WHERE status != 'done';
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(user_id, status);

-- 7. TRANSACTIONS
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INT CHECK (recurring_day BETWEEN 1 AND 31),
  invoice_number TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);

-- 8. EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  meet_link TEXT,
  google_event_id TEXT,
  attendees TEXT[],
  reminder_minutes INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_time ON events(user_id, start_time);

-- 9. AI CONVERSATIONS
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot JSONB,
  total_tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id, updated_at DESC);

-- 10. AI INSIGHTS
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type insight_type NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_label TEXT,
  action_payload JSONB,
  severity insight_severity DEFAULT 'info',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id, acknowledged, created_at DESC);

-- 11. FOCUS SESSIONS
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  duration_minutes INT DEFAULT 50,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_focus_sessions_user_id ON focus_sessions(user_id, started_at DESC);

-- 13. CLIENT INTERACTIONS
CREATE TABLE client_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('meeting', 'call', 'email', 'whatsapp', 'delivery', 'note')),
  description TEXT,
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_client_interactions_client_id ON client_interactions(client_id, interaction_date DESC);

-- 14. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own clients" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own events" ON events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own insights" ON ai_insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own focus sessions" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own settings" ON settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own interactions" ON client_interactions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- HELPER: patrones de retraso por cliente (últimas 4 semanas)
-- ============================================
CREATE OR REPLACE FUNCTION count_overdue_by_client_last_4_weeks(p_user_id UUID)
RETURNS TABLE (client_id UUID, client_name TEXT, weeks_with_overdue INT) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_overdue AS (
    SELECT t.client_id, c.name AS client_name, date_trunc('week', t.due_date) AS week
    FROM tasks t
    JOIN clients c ON c.id = t.client_id
    WHERE t.user_id = p_user_id
      AND t.status != 'done'
      AND t.due_date < NOW()
      AND t.due_date > NOW() - INTERVAL '4 weeks'
    GROUP BY t.client_id, c.name, week
  )
  SELECT wo.client_id, wo.client_name, COUNT(DISTINCT wo.week)::INT
  FROM weekly_overdue wo
  GROUP BY wo.client_id, wo.client_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
