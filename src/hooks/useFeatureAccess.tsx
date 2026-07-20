import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
  | "multi_connection"
  | "chatgpt_credits";

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
  const fallbackPlan: PlanInfo = {
    id: 'free',
    name: 'Plano Livre',
    features: ['chat', 'flows_basic', 'ai_agents', 'mass_sending', 'smart_forms', 'reports', 'tags', 'departments', 'leads_management'],
    max_users: 10,
    max_connections: 3
  };

  const { data: plan = null, isLoading, error, refetch } = useQuery({
    queryKey: ["feature-access", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<PlanInfo> => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .single();

      if (profileError || !profile?.company_id) {
        return fallbackPlan;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select('plan, features, max_users, max_connections')
        .eq("id", profile.company_id)
        .single();

      if (companyError) throw companyError;

      const planSlug = company?.plan || 'basic';
      const { data: subscriptionPlan } = await supabase
        .from("subscription_plans")
        .select('name, features, max_users, max_connections')
        .eq("slug", planSlug)
        .eq("is_active", true)
        .maybeSingle();

      const companyFeatures = Array.isArray((company as { features?: unknown })?.features)
        ? ((company as { features: string[] }).features)
        : null;

      if (subscriptionPlan) {
        return {
          id: planSlug,
          name: subscriptionPlan.name,
          features: companyFeatures || subscriptionPlan.features || [],
          max_users: company?.max_users || subscriptionPlan.max_users,
          max_connections: company?.max_connections || subscriptionPlan.max_connections
        };
      }

      return {
        id: planSlug,
        name: planSlug,
        features: companyFeatures || ['chat', 'flows_basic', 'tags', 'departments'],
        max_users: company?.max_users || 10,
        max_connections: company?.max_connections || 3
      };
    },
  });

  const hasAccess = useCallback(
    (featureId: FeatureId): boolean => {
      if (!plan) return true;
      return plan.features.includes(featureId);
    },
    [plan]
  );

  const hasAnyAccess = useCallback(
    (featureIds: FeatureId[]): boolean => {
      return featureIds.some((id) => hasAccess(id));
    },
    [hasAccess]
  );

  const hasAllAccess = useCallback(
    (featureIds: FeatureId[]): boolean => {
      return featureIds.every((id) => hasAccess(id));
    },
    [hasAccess]
  );

  return {
    hasAccess,
    hasAnyAccess,
    hasAllAccess,
    plan,
    isLoading,
    error: error ? "Erro ao carregar plano" : null,
    refetch: async () => { await refetch(); },
  };
}
