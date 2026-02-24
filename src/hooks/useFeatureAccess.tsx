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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.company_id) {
        // User without company - grant all features by default
        setPlan({
          id: 'free',
          name: 'Plano Livre',
          features: ['chat', 'flows_basic', 'ai_agents', 'mass_sending', 'smart_forms', 'reports', 'tags', 'departments', 'leads_management'],
          max_users: 10,
          max_connections: 3
        });
        setIsLoading(false);
        return;
      }

      // Fetch company and its plan slug
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select('plan, max_users, max_connections')
        .eq("id", profile.company_id)
        .single();

      if (companyError) throw companyError;

      const planSlug = company?.plan || 'basic';

      // Fetch real plan features from subscription_plans
      const { data: subscriptionPlan } = await supabase
        .from("subscription_plans")
        .select('name, features, max_users, max_connections')
        .eq("slug", planSlug)
        .eq("is_active", true)
        .maybeSingle();

      // Check for company-level feature overrides
      const { data: companyFull } = await supabase
        .from("companies")
        .select('features')
        .eq("id", profile.company_id)
        .single();

      const companyFeatures = (companyFull as any)?.features as string[] | null;

      if (subscriptionPlan) {
        setPlan({
          id: planSlug,
          name: subscriptionPlan.name,
          features: companyFeatures || subscriptionPlan.features || [],
          max_users: company?.max_users || subscriptionPlan.max_users,
          max_connections: company?.max_connections || subscriptionPlan.max_connections
        });
      } else {
        // Fallback if plan not found in subscription_plans
        setPlan({
          id: planSlug,
          name: planSlug,
          features: companyFeatures || ['chat', 'flows_basic', 'tags', 'departments'],
          max_users: company?.max_users || 10,
          max_connections: company?.max_connections || 3
        });
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

  const hasAccess = useCallback(
    (featureId: FeatureId): boolean => {
      if (isLoading) return false;
      if (!plan) return false;
      return plan.features.includes(featureId);
    },
    [plan, isLoading]
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
    error,
    refetch: fetchPlanFeatures,
  };
}
