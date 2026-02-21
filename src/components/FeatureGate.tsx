import { ReactNode } from "react";
import { useFeatureAccess, FeatureId } from "@/hooks/useFeatureAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  /** ID da funcionalidade necessária */
  feature: FeatureId;
  /** Conteúdo a ser exibido se tiver acesso */
  children: ReactNode;
  /** Modo de fallback: 'block' mostra tela de bloqueio, 'hide' esconde o conteúdo */
  fallback?: "block" | "hide";
  /** Mensagem customizada para exibir quando bloqueado */
  blockedMessage?: string;
}

interface MultiFeatureGateProps {
  /** IDs das funcionalidades necessárias */
  features: FeatureId[];
  /** Se true, requer TODAS as features. Se false, requer pelo menos UMA */
  requireAll?: boolean;
  children: ReactNode;
  fallback?: "block" | "hide";
  blockedMessage?: string;
}

// Mapeamento de feature ID para nome legível
const FEATURE_NAMES: Record<FeatureId, string> = {
  chat: "Chat/Conversas",
  flows_basic: "Fluxos Básicos",
  flows_advanced: "Fluxos Avançados",
  ai_agents: "Agentes de IA",
  mass_sending: "Disparo em Massa",
  smart_forms: "Formulários Inteligentes",
  reports: "Relatórios",
  tags: "Tags/Etiquetas",
  departments: "Departamentos",
  google_drive: "Google Drive Backup",
  webhooks: "Webhooks/API",
  scheduled_messages: "Agendamento",
  internal_chat: "Chat Interno",
  leads_management: "Gestão de Leads",
  multi_connection: "Múltiplas Conexões",
  chatgpt_credits: "ChatGPT / Créditos OpenAI"
};

function BlockedContent({ 
  featureName, 
  message,
  planName 
}: { 
  featureName: string; 
  message?: string;
  planName?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
        <Lock className="h-10 w-10 text-amber-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2">
        Funcionalidade Bloqueada
      </h2>
      
      <p className="text-slate-400 max-w-md mb-2">
        {message || `A funcionalidade "${featureName}" não está disponível no seu plano atual.`}
      </p>
      
      {planName && (
        <p className="text-sm text-slate-500 mb-6">
          Plano atual: <span className="text-amber-400 font-medium">{planName}</span>
        </p>
      )}
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="border-white/10 text-slate-300 hover:bg-white/5"
        >
          Voltar
        </Button>
        <Button
          onClick={() => navigate("/settings")}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Crown className="h-4 w-4 mr-2" />
          Ver Planos
        </Button>
      </div>
    </div>
  );
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = "block",
  blockedMessage 
}: FeatureGateProps) {
  const { hasAccess, plan, isLoading } = useFeatureAccess();
  const { role, isLoading: roleLoading } = useUserRole();

  // Admins têm acesso total
  if (role === "admin") {
    return <>{children}</>;
  }

  // Enquanto carrega, mostra loading ou nada
  if (isLoading || roleLoading) {
    if (fallback === "hide") return null;
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Verifica acesso
  if (hasAccess(feature)) {
    return <>{children}</>;
  }

  // Sem acesso
  if (fallback === "hide") {
    return null;
  }

  return (
    <BlockedContent 
      featureName={FEATURE_NAMES[feature]} 
      message={blockedMessage}
      planName={plan?.name}
    />
  );
}

export function MultiFeatureGate({ 
  features, 
  requireAll = false,
  children, 
  fallback = "block",
  blockedMessage 
}: MultiFeatureGateProps) {
  const { hasAnyAccess, hasAllAccess, plan, isLoading } = useFeatureAccess();
  const { role, isLoading: roleLoading } = useUserRole();

  // Admins têm acesso total
  if (role === "admin") {
    return <>{children}</>;
  }

  if (isLoading || roleLoading) {
    if (fallback === "hide") return null;
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const hasPermission = requireAll 
    ? hasAllAccess(features) 
    : hasAnyAccess(features);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback === "hide") {
    return null;
  }

  const featureNames = features.map(f => FEATURE_NAMES[f]).join(", ");

  return (
    <BlockedContent 
      featureName={featureNames} 
      message={blockedMessage}
      planName={plan?.name}
    />
  );
}

// Hook helper para verificar acesso em componentes
export function useHasFeature(feature: FeatureId): boolean {
  const { hasAccess, isLoading } = useFeatureAccess();
  const { role } = useUserRole();

  if (role === "admin") return true;
  if (isLoading) return false;
  return hasAccess(feature);
}
