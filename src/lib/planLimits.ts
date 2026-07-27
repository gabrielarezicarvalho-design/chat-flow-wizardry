// Limites por plano (mensal onde aplicável)
// null = ilimitado
export type PlanSlug = "start" | "business" | string;

export type LimitResource =
  | "attendants"
  | "connections"
  | "agents"
  | "flows"
  | "departments"
  | "users"
  | "mass_sends_month"
  | "contacts_month"
  | "sales_month"
  | "cobrancas_month";

export interface PlanLimits {
  attendants: number | null;
  connections: number | null;
  agents: number | null;
  flows: number | null;
  departments: number | null;
  users: number | null;
  mass_sends_month: number | null;
  contacts_month: number | null;
  sales_month: number | null;
  cobrancas_month: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  start: {
    attendants: 5,
    connections: 2,
    agents: 3,
    flows: 3,
    departments: 4,
    users: 10,
    mass_sends_month: 100,
    contacts_month: 500,
    sales_month: 500,
    cobrancas_month: 500,
  },
  business: {
    attendants: null,
    connections: null,
    agents: null,
    flows: null,
    departments: null,
    users: null,
    mass_sends_month: null,
    contacts_month: null,
    sales_month: null,
    cobrancas_month: null,
  },
};

export const RESOURCE_LABELS: Record<LimitResource, string> = {
  attendants: "Atendentes",
  connections: "Conexões WhatsApp",
  agents: "Agentes de IA",
  flows: "Fluxos de IA",
  departments: "Departamentos",
  users: "Usuários",
  mass_sends_month: "Disparos em massa (mês)",
  contacts_month: "Contatos (mês)",
  sales_month: "Vendas (mês)",
  cobrancas_month: "Cobranças (mês)",
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const slug = (plan || "start").toLowerCase();
  return PLAN_LIMITS[slug] || PLAN_LIMITS.start;
}
