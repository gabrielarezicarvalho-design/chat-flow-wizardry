import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export const TRIAL_DAYS = 2;
export const TRIAL_PLAN = "basic";

export const guardCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface TrialStatus {
  companyId: string | null;
  plan: string | null;
  trialEndsAt: string | null;
  expired: boolean;
}

/**
 * Retorna o status do teste grátis (2 dias) da empresa do usuário autenticado.
 * Requisições sem token (webhooks, crons) não são bloqueadas.
 */
export async function getTrialStatus(req: Request): Promise<TrialStatus> {
  const none: TrialStatus = { companyId: null, plan: null, trialEndsAt: null, expired: false };

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return none;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (!user) return none;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) return none;

  const { data: company } = await supabase
    .from("companies")
    .select("plan, created_at")
    .eq("id", profile.company_id)
    .maybeSingle();

  const plan = (company?.plan || "").toLowerCase();
  if (plan !== TRIAL_PLAN || !company?.created_at) {
    return { companyId: profile.company_id, plan, trialEndsAt: null, expired: false };
  }

  const endsAt = new Date(
    new Date(company.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );

  return {
    companyId: profile.company_id,
    plan,
    trialEndsAt: endsAt.toISOString(),
    expired: Date.now() > endsAt.getTime(),
  };
}

/**
 * Retorna uma Response 402 padronizada quando o teste grátis expirou,
 * ou `null` quando a ação pode continuar.
 */
export async function requireActivePlan(
  req: Request,
  corsHeaders: Record<string, string> = guardCorsHeaders,
): Promise<Response | null> {
  const status = await getTrialStatus(req);
  if (!status.expired) return null;

  return new Response(
    JSON.stringify({
      error: "trial_expired",
      code: "TRIAL_EXPIRED",
      upgrade_required: true,
      trial_days: TRIAL_DAYS,
      trial_ends_at: status.trialEndsAt,
      message:
        `Seu teste grátis de ${TRIAL_DAYS} dias terminou. Assine um plano para liberar novamente todas as funcionalidades.`,
    }),
    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
