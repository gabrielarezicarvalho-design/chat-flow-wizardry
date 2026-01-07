import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type FeatureId = 
  | "chat"
  | "flows_basic"
  | "flows_advanced"
  | "ai_agents"
  | "mass_sending"
  | "smart_forms"
  | "reports"
  | "tags"
  | "departments"
  | "google_drive"
  | "webhooks"
  | "scheduled_messages"
  | "internal_chat"
  | "leads_management"
  | "multi_connection";

interface PlanInfo {
  id: string;
  name: string;
  features: string[];
  max_users: number | null;
  max_connections: number | null;
}

interface FeatureAccessResult {
  hasAccess: (featureId: FeatureId) => boolean;
  hasAnyAccess: (featureIds: FeatureId[]) => boolean;
  hasAllAccess: (featureIds: FeatureId[]) => boolean;
  plan: PlanInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFeatureAccess(): FeatureAccessResult {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanFeatures = useCallback(async () => {
    if (!user?.id) {
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar o profile do usuário para obter o company_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.company_id) {
        // Usuário sem empresa - pode ser admin ou usuário sem vínculo
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Buscar a empresa e seu plano
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select(`
          plan_id,
          subscription_plans (
            id,
            name,
            features,
            max_users,
            max_connections
          )
        `)
        .eq("id", profile.company_id)
        .single();

      if (companyError) {
        throw companyError;
      }

      if (company?.subscription_plans) {
        const planData = company.subscription_plans as any;
        setPlan({
          id: planData.id,
          name: planData.name,
          features: Array.isArray(planData.features) 
            ? planData.features.filter((f: unknown): f is string => typeof f === 'string')
            : [],
          max_users: planData.max_users,
          max_connections: planData.max_connections
        });
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error("Error fetching plan features:", err);
      setError("Erro ao carregar plano");
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlanFeatures();
  }, [fetchPlanFeatures]);

  const hasAccess = useCallback((featureId: FeatureId): boolean => {
    // Se não tem plano, não tem acesso (exceto admins que são tratados separadamente)
    if (!plan) return false;
    return plan.features.includes(featureId);
  }, [plan]);

  const hasAnyAccess = useCallback((featureIds: FeatureId[]): boolean => {
    return featureIds.some(id => hasAccess(id));
  }, [hasAccess]);

  const hasAllAccess = useCallback((featureIds: FeatureId[]): boolean => {
    return featureIds.every(id => hasAccess(id));
  }, [hasAccess]);

  return {
    hasAccess,
    hasAnyAccess,
    hasAllAccess,
    plan,
    isLoading,
    error,
    refetch: fetchPlanFeatures
  };
}
