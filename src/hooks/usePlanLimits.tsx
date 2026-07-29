import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  getPlanLimits,
  LimitResource,
  PlanLimits,
  RESOURCE_LABELS,
} from "@/lib/planLimits";

interface UsageData {
  cycle_start?: string;
  cycle_end?: string;
  users?: number;
  attendants?: number;
  connections?: number;
  agents?: number;
  flows?: number;
  departments?: number;
  mass_sends_month?: number;
  contacts_month?: number;
  sales_month?: number;
  cobrancas_month?: number;
}

export interface LimitStatus {
  resource: LimitResource;
  label: string;
  current: number;
  max: number | null;
  percent: number;
  warning: boolean; // >=80%
  blocked: boolean; // >=100%
  unlimited: boolean;
}

export function usePlanLimits() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["plan-limits", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .maybeSingle();

      if (!profile?.company_id) {
        return {
          plan: "start",
          limits: getPlanLimits("start"),
          usage: {} as UsageData,
        };
      }

      const { data: company } = await supabase
        .from("companies")
        .select("plan")
        .eq("id", profile.company_id)
        .maybeSingle();

      const planSlug = (company?.plan || "start").toLowerCase();

      const { data: usage } = await supabase.rpc("get_plan_usage", {
        _company_id: profile.company_id,
      });

      return {
        plan: planSlug,
        limits: getPlanLimits(planSlug),
        usage: (usage as UsageData) || {},
      };
    },
  });

  const plan = data?.plan || "start";
  const limits: PlanLimits = data?.limits || getPlanLimits("start");
  const usage: UsageData = data?.usage || {};

  const getStatus = useCallback(
    (resource: LimitResource, increment = 0): LimitStatus => {
      const max = limits[resource];
      const current = (usage[resource] || 0) + increment;
      const unlimited = max === null || max === undefined;
      const percent = unlimited ? 0 : Math.min(100, (current / max!) * 100);
      return {
        resource,
        label: RESOURCE_LABELS[resource],
        current,
        max,
        percent,
        warning: !unlimited && percent >= 80 && percent < 100,
        blocked: !unlimited && current >= max!,
        unlimited,
      };
    },
    [limits, usage]
  );

  const check = useCallback(
    (resource: LimitResource, increment = 1): boolean => {
      const st = getStatus(resource);
      if (st.unlimited) return true;

      // Bloqueia se já atingiu o limite
      if (st.blocked) {
        toast.error(
          `Limite do plano ${plan} atingido: ${st.label} (${st.current}/${st.max}). Faça upgrade para continuar.`,
          { duration: 8000 }
        );
        return false;
      }

      // Bloqueia se esta ação ultrapassaria o limite
      const after = getStatus(resource, increment);
      if (after.current > (st.max as number)) {
        const restante = Math.max(0, (st.max as number) - st.current);
        toast.error(
          `Esta ação excede o limite do plano ${plan}: ${st.label} (${st.current}/${st.max}). Você ainda pode usar ${restante}. Faça upgrade para liberar mais.`,
          { duration: 8000 }
        );
        return false;
      }

      if (after.warning) {
        toast.warning(
          `Atenção: ${st.label} em ${Math.round(after.percent)}% (${after.current}/${after.max}).`
        );
      }
      return true;
    },
    [getStatus, plan]
  );


  const allStatuses = useCallback((): LimitStatus[] => {
    return (Object.keys(RESOURCE_LABELS) as LimitResource[]).map((r) =>
      getStatus(r)
    );
  }, [getStatus]);

  return {
    plan,
    limits,
    usage,
    isLoading,
    refetch,
    getStatus,
    check,
    allStatuses,
  };
}
