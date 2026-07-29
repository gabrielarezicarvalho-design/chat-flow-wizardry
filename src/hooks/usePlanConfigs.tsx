import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS, PlanLimits, getPlanLimits } from "@/lib/planLimits";

export interface PlanConfig {
  slug: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  is_active: boolean;
  sort_order: number;
  limits: PlanLimits;
}

const FALLBACK: PlanConfig[] = Object.entries(PLAN_LIMITS).map(
  ([slug, limits], i) => ({
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    price_monthly: 0,
    price_annual: 0,
    is_active: true,
    sort_order: i + 1,
    limits,
  })
);

export function normalizeLimits(raw: unknown, slug: string): PlanLimits {
  const base = getPlanLimits(slug);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const out = { ...base } as Record<string, number | null>;
  for (const key of Object.keys(base)) {
    if (key in obj) {
      const v = obj[key];
      out[key] = v === null || v === "" ? null : Number(v);
    }
  }
  return out as unknown as PlanLimits;
}

export function usePlanConfigs() {
  const query = useQuery({
    queryKey: ["plan-configs"],
    staleTime: 60_000,
    queryFn: async (): Promise<PlanConfig[]> => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error || !data?.length) return FALLBACK;

      return data.map((row) => ({
        slug: row.slug,
        name: row.name,
        price_monthly: Number(row.price_monthly ?? 0),
        price_annual: Number(row.price_annual ?? 0),
        is_active: row.is_active,
        sort_order: row.sort_order,
        limits: normalizeLimits(row.limits, row.slug),
      }));
    },
  });

  return {
    plans: query.data || FALLBACK,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
