import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Save, Globe, Clock, MessageSquare, Palette, Shield } from "lucide-react";
import { GoogleDriveBackup } from "@/components/settings/GoogleDriveBackup";

export function AdminConfiguracoes() {
  const [settings, setSettings] = useState({
    platformName: "Next Pro",
    supportEmail: "suporte@nextpro.com.br",
    defaultSLA: "24",
    maintenanceMode: false,
    defaultWelcomeMessage: "Olá! Seja bem-vindo ao nosso atendimento.",
    defaultClosingMessage: "Obrigado pelo contato! Até logo.",
    maxConnectionsPerCompany: 5,
    maxFlowsPerCompany: 20,
    maxUsersPerCompany: 10,
    privacyPolicyUrl: "",
    termsOfServiceUrl: ""
  });

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações Gerais</h1>
          <p className="text-slate-400">Configurações globais da plataforma</p>
        </div>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-purple-400" />
            <h2 className="font-semibold text-white">Marca</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Plataforma</Label>
              <Input
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Email de Suporte</Label>
              <Input
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </div>

        {/* SLA & Limits */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-cyan-400" />
            <h2 className="font-semibold text-white">SLA & Limites Padrão</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>SLA Padrão (horas)</Label>
              <Input
                type="number"
                value={settings.defaultSLA}
                onChange={(e) => setSettings({ ...settings, defaultSLA: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Conexões</Label>
                <Input
                  type="number"
                  value={settings.maxConnectionsPerCompany}
                  onChange={(e) => setSettings({ ...settings, maxConnectionsPerCompany: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Fluxos</Label>
                <Input
                  type="number"
                  value={settings.maxFlowsPerCompany}
                  onChange={(e) => setSettings({ ...settings, maxFlowsPerCompany: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Usuários</Label>
                <Input
                  type="number"
                  value={settings.maxUsersPerCompany}
                  onChange={(e) => setSettings({ ...settings, maxUsersPerCompany: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Default Messages */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Mensagens Padrão</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                value={settings.defaultWelcomeMessage}
                onChange={(e) => setSettings({ ...settings, defaultWelcomeMessage: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem de Encerramento</Label>
              <Textarea
                value={settings.defaultClosingMessage}
                onChange={(e) => setSettings({ ...settings, defaultClosingMessage: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* System */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-amber-400" />
            <h2 className="font-semibold text-white">Sistema</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div>
                <Label className="text-red-400">Modo Manutenção</Label>
                <p className="text-xs text-slate-400 mt-1">Desativa o acesso para todos os clientes</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
              />
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-slate-300 mb-2">Versão do Sistema</p>
              <p className="text-lg font-mono text-white">v1.0.0-beta</p>
            </div>
          </div>
        </div>

        {/* Meta / Políticas */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-blue-400" />
            <h2 className="font-semibold text-white">Políticas e Termos (Meta Embedded Signup)</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">URLs exibidas na caixa de diálogo de Login e Detalhes do aplicativo Meta</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL da Política de Privacidade</Label>
              <Input
                type="url"
                placeholder="Política de Privacidade da caixa de diálogo Login e Detalhes do aplicativo"
                value={settings.privacyPolicyUrl}
                onChange={(e) => setSettings({ ...settings, privacyPolicyUrl: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label>URL dos Termos de Serviço</Label>
              <Input
                type="url"
                placeholder="Termos de Serviço da caixa de diálogo de login e detalhes do app"
                value={settings.termsOfServiceUrl}
                onChange={(e) => setSettings({ ...settings, termsOfServiceUrl: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Google Drive Backup - Full Width */}
        <div className="lg:col-span-2">
          <GoogleDriveBackup />
        </div>
      </div>
    </div>
  );
}
