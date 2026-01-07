import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Brain, Cpu, TrendingUp, Building2, RefreshCw, Key, CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface AIUsage {
  company: string;
  companyId: string;
  agents: number;
  conversationsToday: number;
  hasGeminiKey: boolean;
  hasOpenAIKey: boolean;
  aiProvider: string;
}

export function AdminIA() {
  const [usage, setUsage] = useState<AIUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [companiesWithKeys, setCompaniesWithKeys] = useState(0);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const [agentsRes, profilesRes, companiesRes] = await Promise.all([
        supabase.from("agents").select("*"),
        supabase.from("profiles").select("id, company_name, company_id"),
        supabase.from("companies").select("id, name, gemini_api_key, openai_api_key, ai_provider")
      ]);

      const agents = agentsRes.data || [];
      const profiles = profilesRes.data || [];
      const companies = companiesRes.data || [];
      
      const profileMap = new Map(profiles.map(p => [p.id, { 
        companyName: p.company_name, 
        companyId: p.company_id 
      }]));
      
      const companyMap = new Map(companies.map(c => [c.id, c]));

      // Group by company
      const companyData: Record<string, AIUsage> = {};
      
      // First, add all companies
      companies.forEach(company => {
        companyData[company.id] = {
          company: company.name,
          companyId: company.id,
          agents: 0,
          conversationsToday: 0,
          hasGeminiKey: !!company.gemini_api_key,
          hasOpenAIKey: !!company.openai_api_key,
          aiProvider: company.ai_provider || 'gemini'
        };
      });

      // Then add agents data
      agents.forEach(agent => {
        const profileInfo = profileMap.get(agent.user_id);
        const companyId = profileInfo?.companyId;
        
        if (companyId && companyData[companyId]) {
          companyData[companyId].agents++;
          companyData[companyId].conversationsToday += agent.conversations_today || 0;
        }
      });

      const usageList = Object.values(companyData);
      const withKeys = usageList.filter(u => u.hasGeminiKey || u.hasOpenAIKey).length;

      setUsage(usageList);
      setTotalAgents(agents.length);
      setTotalConversations(agents.reduce((sum, a) => sum + (a.conversations_today || 0), 0));
      setCompaniesWithKeys(withKeys);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">IA & Automação</h1>
        <p className="text-slate-400">Visão geral das configurações de IA por empresa</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-purple-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-400 mb-1">Chaves de IA Externas</h3>
            <p className="text-sm text-slate-300">
              Cada empresa configura suas próprias chaves de API (Google Gemini ou OpenAI).
              Os custos são gerenciados diretamente pelas empresas em suas contas dos provedores.
            </p>
            <div className="flex gap-4 mt-2">
              <a 
                href="https://aistudio.google.com/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                Google AI Studio <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://platform.openai.com/usage" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                OpenAI Usage <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalAgents}</p>
              <p className="text-xs text-slate-400">Agentes IA</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Key className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-white">{companiesWithKeys}</p>
              <p className="text-xs text-slate-400">Empresas com Chaves</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalConversations}</p>
              <p className="text-xs text-slate-400">Conversas IA Hoje</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Cpu className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">2</p>
              <p className="text-xs text-slate-400">Provedores Suportados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Providers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Provedores Suportados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="font-medium text-white">Google Gemini</p>
                <p className="text-sm text-slate-400">Gemini 1.5 Flash / Pro</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400">Disponível</Badge>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">OpenAI ChatGPT</p>
                <p className="text-sm text-slate-400">GPT-4o / GPT-4o Mini</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400">Disponível</Badge>
          </div>
        </div>
      </div>

      {/* Usage by Company */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Configuração por Empresa</h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : usage.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma empresa cadastrada
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Empresa</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Agentes</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Conversas Hoje</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Provedor</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Gemini</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">OpenAI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usage.map((item) => (
                  <tr key={item.companyId} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-white">{item.company}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">{item.agents}</td>
                    <td className="p-4 text-slate-300">{item.conversationsToday}</td>
                    <td className="p-4">
                      <Badge className={item.aiProvider === 'openai' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}>
                        {item.aiProvider === 'openai' ? 'OpenAI' : 'Gemini'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {item.hasGeminiKey ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-600" />
                      )}
                    </td>
                    <td className="p-4">
                      {item.hasOpenAIKey ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
