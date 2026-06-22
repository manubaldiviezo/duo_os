import { supabase } from './supabase';
import { calculateMRR } from './mrr';

export const SYSTEM_PROMPT_TEMPLATE = `Eres el asistente operativo de {{AGENCY_NAME}}, dirigida por {{USER_NAME}} ({{USER_ROLE}}).
Hoy es {{CURRENT_DATE}}. Hora local: {{CURRENT_TIME}} ({{TIMEZONE}}).

=== CONTEXTO ACTUAL DE LA AGENCIA ===
MRR (Monthly Recurring Revenue):
- Actual: \${{MRR_CURRENT}} USD
- Objetivo: \${{MRR_GOAL}} USD
- Gap: \${{MRR_GAP}} USD ({{MRR_GAP_PERCENT}}% por crecer)

Clientes activos ({{CLIENTS_COUNT}}):
{{CLIENTS_LIST_JSON}}

Tareas vencidas ({{OVERDUE_COUNT}}):
{{OVERDUE_TASKS_JSON}}

Tareas pendientes esta semana ({{WEEK_TASKS_COUNT}}):
{{WEEK_TASKS_JSON}}

Próximos eventos (7 días):
{{UPCOMING_EVENTS_JSON}}

Finanzas del mes en curso:
- Ingresos cobrados: \${{INCOME_RECEIVED}}
- Ingresos pendientes: \${{INCOME_PENDING}}
- Gastos: \${{EXPENSES}}
- Margen actual: \${{MARGIN}} ({{MARGIN_PERCENT}}%)

Alertas IA activas ({{INSIGHTS_COUNT}}):
{{INSIGHTS_JSON}}

=== TU ROL ===
Eres el copiloto estratégico de un CEO que opera una agencia de marketing. Combinas:
1. Asistente ejecutivo — respondes con datos reales del contexto
2. Organizador inteligente — conviertes audio/texto caótico en tareas estructuradas
3. Detector de patrones — identificas riesgos antes de que sean problemas
4. Coach de crecimiento — ayudas a cerrar el gap entre MRR actual y objetivo
5. Recomendador de prioridades — sugieres qué hacer primero hoy

=== REGLAS DE RESPUESTA ===
- Español, tutea siempre, tono ejecutivo pero cercano
- Máximo 3-4 oraciones por respuesta normal
- Siempre sugiere la siguiente acción concreta
- NO inventes datos. Si no tienes información, dilo explícitamente
- Prioriza acciones que impacten el MRR si está debajo del objetivo

=== FORMATO DE RESPUESTA POR INTENT ===
Si el usuario describe tareas para crear, devuelve SOLO un objeto JSON válido:
{
  "action": "create_tasks",
  "tasks": [
    {
      "title": "string (max 80 chars)",
      "client_id": "uuid o null",
      "client_name": "string",
      "category": "strategy | content | ads | reports | design | meeting | admin | other",
      "priority": "high | medium | low",
      "due_date": "YYYY-MM-DD",
      "estimated_minutes": 30,
      "description": "string opcional"
    }
  ],
  "confirmation_message": "Detecté N tareas. ¿Las creo?"
}

Reglas para extracción:
- Si menciona un cliente por nombre, busca el match en la lista de clientes activos y usa su id.
- Si menciona "mañana", "viernes", etc., calcula la fecha real.
- Si no especifica prioridad usa "medium", salvo "urgente" -> "high".

Para todo lo demás responde en texto plano natural en español, máximo 4 oraciones.

=== NUNCA HAGAS ===
- Inventar datos de clientes o números
- Dar respuestas largas si una corta sirve
- Usar emojis excesivos (máximo 1 por respuesta si es relevante)`;

export type ContextSnapshot = Record<string, string | number>;

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

export async function buildContextSnapshot(userId: string): Promise<ContextSnapshot> {
  const nowISO = new Date().toISOString();
  const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];

  const [profileRes, clientsRes, overdueRes, weekRes, eventsRes, txRes, insightsRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('clients')
        .select('id, name, industry, monthly_fee, status, last_contact_date')
        .eq('user_id', userId)
        .in('status', ['active', 'at_risk']),
      supabase
        .from('tasks')
        .select('id, title, priority, due_date, client:clients(name)')
        .eq('user_id', userId)
        .neq('status', 'done')
        .lt('due_date', nowISO),
      supabase
        .from('tasks')
        .select('id, title, priority, due_date, client:clients(name)')
        .eq('user_id', userId)
        .neq('status', 'done')
        .gte('due_date', nowISO)
        .lte('due_date', inDays(7)),
      supabase
        .from('events')
        .select('id, title, start_time, client:clients(name)')
        .eq('user_id', userId)
        .gte('start_time', nowISO)
        .lte('start_time', inDays(7)),
      supabase.from('transactions').select('type, amount').eq('user_id', userId).gte('date', monthStart),
      supabase.from('ai_insights').select('type, title, severity').eq('user_id', userId).eq('acknowledged', false),
    ]);

  const profile = profileRes.data;
  const mrr = await calculateMRR(userId);

  const tx = txRes.data ?? [];
  const incomeReceived = tx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const incomePending = tx
    .filter((t) => t.type === 'pending_income')
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const margin = incomeReceived - expenses;

  return {
    AGENCY_NAME: profile?.agency_name ?? 'Mi Agencia',
    USER_NAME: profile?.user_name ?? 'Usuario',
    USER_ROLE: profile?.user_role ?? 'CEO',
    CURRENT_DATE: new Date().toLocaleDateString('es-BO'),
    CURRENT_TIME: new Date().toLocaleTimeString('es-BO'),
    TIMEZONE: profile?.timezone ?? 'America/La_Paz',
    MRR_CURRENT: mrr.current,
    MRR_GOAL: mrr.goal,
    MRR_GAP: mrr.gap,
    MRR_GAP_PERCENT: mrr.gapPercent.toFixed(1),
    CLIENTS_COUNT: clientsRes.data?.length ?? 0,
    CLIENTS_LIST_JSON: JSON.stringify(clientsRes.data ?? []),
    OVERDUE_COUNT: overdueRes.data?.length ?? 0,
    OVERDUE_TASKS_JSON: JSON.stringify(overdueRes.data ?? []),
    WEEK_TASKS_COUNT: weekRes.data?.length ?? 0,
    WEEK_TASKS_JSON: JSON.stringify(weekRes.data ?? []),
    UPCOMING_EVENTS_JSON: JSON.stringify(eventsRes.data ?? []),
    INCOME_RECEIVED: incomeReceived,
    INCOME_PENDING: incomePending,
    EXPENSES: expenses,
    MARGIN: margin,
    MARGIN_PERCENT: incomeReceived > 0 ? ((margin / incomeReceived) * 100).toFixed(1) : '0',
    INSIGHTS_COUNT: insightsRes.data?.length ?? 0,
    INSIGHTS_JSON: JSON.stringify(insightsRes.data ?? []),
  };
}

export function fillPrompt(template: string, snapshot: ContextSnapshot): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(snapshot[key] ?? ''));
}

export async function buildSystemPrompt(userId: string): Promise<string> {
  const snapshot = await buildContextSnapshot(userId);
  return fillPrompt(SYSTEM_PROMPT_TEMPLATE, snapshot);
}
