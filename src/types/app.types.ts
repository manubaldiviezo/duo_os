export type ClientStatus = 'active' | 'at_risk' | 'churned' | 'proposal' | 'paused';
export type TaskCategory =
  | 'strategy'
  | 'content'
  | 'ads'
  | 'reports'
  | 'design'
  | 'meeting'
  | 'admin'
  | 'other';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskSource = 'manual' | 'voice' | 'ai_suggestion' | 'recurring';
export type TransactionType = 'income' | 'expense' | 'pending_income';
export type ProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'done' | 'cancelled';
export type InsightType =
  | 'churn_risk'
  | 'pattern_detected'
  | 'time_block_suggestion'
  | 'morning_briefing'
  | 'mrr_alert'
  | 'opportunity';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Profile {
  id: string;
  agency_name: string;
  user_name: string;
  user_role: string | null;
  logo_url: string | null;
  brand_color: string;
  brand_color_dark: string;
  brand_color_light: string;
  brand_color_secondary: string | null;
  font_family: string | null;
  timezone: string;
  currency: string;
  mrr_goal: number;
  onboarding_completed: boolean;
  plan: string | null;
  plan_started_at: string | null;
  ai_messages_month: number | null;
  ai_messages_reset: string | null;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  content: string;
  type: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  monthly_fee: number;
  status: ClientStatus;
  services: string[];
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  start_date: string | null;
  contract_end_date: string | null;
  last_contact_date: string | null;
  notes: string | null;
  custom_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_end: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_via: TaskSource;
  completed_at: string | null;
  assigned_member_id: string | null;
  created_at: string;
  updated_at: string;
  client?: { name: string } | null;
}

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  client_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  is_recurring: boolean;
  recurring_day: number | null;
  invoice_number: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  client?: { name: string } | null;
}

export interface AgencyEvent {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  meet_link: string | null;
  google_event_id: string | null;
  attendees: string[] | null;
  reminder_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AiInsight {
  id: string;
  user_id: string;
  type: InsightType;
  client_id: string | null;
  title: string;
  description: string;
  action_label: string | null;
  action_payload: Record<string, unknown> | null;
  severity: InsightSeverity;
  acknowledged: boolean;
  acknowledged_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  createdAt: number;
}
