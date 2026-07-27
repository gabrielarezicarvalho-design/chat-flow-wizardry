import { lazy, Suspense, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building, User, Key, Webhook, Link as LinkIcon, CreditCard, Eye, EyeOff, Check, AlertCircle, Loader2, HardDrive, RefreshCw, FileText, Image, Database, Shield, X, Trash2, Mic } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useStorageStats } from "@/hooks/useStorageStats";

import { toast } from "sonner";

const AISettingsSection = lazy(() => import("@/components/settings/AISettingsSection").then((module) => ({ default: module.AISettingsSection })));
const ElevenLabsSettingsSection = lazy(() => import("@/components/settings/ElevenLabsSettingsSection").then((module) => ({ default: module.ElevenLabsSettingsSection })));
const PrivacyPolicyContent = lazy(() => import("@/components/settings/PrivacyPolicyContent"));
const TermsOfServiceContent = lazy(() => import("@/components/settings/TermsOfServiceContent"));

const SettingsSectionFallback = () => (
  <Card className="p-6">
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  </Card>
);

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("geral");
  const { stats: storageStats, isLoading: storageLoading, refetch: refetchStorage, formatBytes } = useStorageStats(activeTab === "armazenamento");
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  
  // Form states
  const [companyName, setCompanyName] = useState(settings?.company_name || "");
  const [email, setEmail] = useState(settings?.email || "");
  const [phone, setPhone] = useState(settings?.phone || "");
  const [website, setWebsite] = useState(settings?.website || "");
  const [whatsappInstanceId, setWhatsappInstanceId] = useState(settings?.whatsapp_instance_id || "");
  const [whatsappToken, setWhatsappToken] = useState(settings?.whatsapp_token || "");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(settings?.privacy_policy_url || "");
  const [termsOfServiceUrl, setTermsOfServiceUrl] = useState(settings?.terms_of_service_url || "");

  useEffect(() => {
    if (settings) {
      const baseUrl = window.location.origin;
      setCompanyName(settings.company_name || "");
      setEmail(settings.email || "");
      setPhone(settings.phone || "");
      setWebsite(settings.website || "");
      setWhatsappInstanceId(settings.whatsapp_instance_id || "");
      setWhatsappToken(settings.whatsapp_token || "");
      setPrivacyPolicyUrl(settings.privacy_policy_url || `${baseUrl}/politica-de-privacidade`);
      setTermsOfServiceUrl(settings.terms_of_service_url || `${baseUrl}/termos-de-servico`);
    }
  }, [settings]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada!`);
  };

  const handleSaveSettings = () => {
    updateSettings.mutate({
      company_name: companyName,
      email,
      phone,
      website
    });
  };

  const handleConnectWhatsApp = () => {
    updateSettings.mutate({
      whatsapp_instance_id: whatsappInstanceId,
      whatsapp_token: whatsappToken,
      whatsapp_status: 'online'
    });
  };

  const handleGenerateKey = () => {
    const newKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    copyToClipboard(newKey, "Nova API Key");
  };


  const tabs = [
    { id: "geral", icon: Building, label: "Geral" },
    { id: "armazenamento", icon: HardDrive, label: "Armazenamento" },
    { id: "perfil", icon: User, label: "Perfil" },
    { id: "apikeys", icon: Key, label: "API Keys" },
    { id: "webhooks", icon: Webhook, label: "Webhooks" },
    { id: "voz", icon: Mic, label: "Voz IA" },
    { id: "integracoes", icon: LinkIcon, label: "Integrações" },
    { id: "politicas", icon: Shield, label: "Políticas" },
    { id: "plano", icon: CreditCard, label: "Plano" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <Card className="col-span-3 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="col-span-9 space-y-6">
          {activeTab === "geral" && (
            <>
              {/* Configuração Geral */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Configuração Geral</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label htmlFor="maxFileSize">Tamanho máximo para arquivos*</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input id="maxFileSize" defaultValue="3000000" className="flex-1" />
                      <span className="text-sm text-muted-foreground">KB</span>
                    </div>
                  </div>
                  <div>
                    <Label>Fila para notificações</Label>
                    <Select defaultValue="none">
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>País</Label>
                    <Select defaultValue="brasil">
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brasil">Brasil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Idioma</Label>
                    <Select defaultValue="pt-br">
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-br">Português Brasileiro</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <Label>Fuso horário</Label>
                    <Select defaultValue="sao_paulo">
                      <SelectTrigger className="mt-2 w-[200px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sao_paulo">America/Sao_Paulo</SelectItem>
                        <SelectItem value="brasilia">America/Brasilia</SelectItem>
                        <SelectItem value="fortaleza">America/Fortaleza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="mt-7 bg-primary">Salvar fuso horário</Button>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-muted-foreground" />
                    <span className="text-sm">Desabilitar citações</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-muted-foreground" />
                    <span className="text-sm">Reduzir qualidade das imagens enviadas</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-muted-foreground" />
                    <span className="text-sm">Bloquear criar contatos com mesmo número</span>
                  </label>
                </div>
              </Card>

              {/* Senha e segurança */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Senha e segurança</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <Label>Validade das senhas</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input type="number" defaultValue="0" className="w-20" />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-muted-foreground" />
                  <span className="text-sm">Habilitar política de senhas fortes</span>
                </label>
              </Card>

              {/* Informações da Empresa */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Informações da Empresa</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Nome da Empresa</Label>
                    <Input 
                      id="company" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Sua Empresa" 
                      className="mt-2" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@empresa.com" 
                      className="mt-2" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+55 11 98765-4321" 
                      className="mt-2" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input 
                      id="website" 
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://empresa.com" 
                      className="mt-2" 
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90"
                  onClick={handleSaveSettings}
                >
                  Salvar Alterações
                </Button>
              </Card>
            </>
          )}


          {activeTab === "armazenamento" && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Armazenamento</h2>
                  <p className="text-muted-foreground text-sm">
                    Monitore o uso de armazenamento do seu sistema.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchStorage()}
                  disabled={storageLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${storageLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              
              {storageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Uso atual por bucket */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Uso por Categoria
                      </h3>
                      <div className="space-y-4">
                        {/* Documentos IA */}
                        {(() => {
                          const docsBucket = storageStats?.buckets.find(b => b.name === 'agent-documents');
                          const docsSize = docsBucket?.size || 0;
                          const docsLimit = 500 * 1024 * 1024; // 500MB
                          const docsPercent = (docsSize / docsLimit) * 100;
                          return (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-2">
                                  <FileText className="w-3 h-3 text-primary" />
                                  Documentos IA
                                </span>
                                <span className="text-muted-foreground">
                                  {formatBytes(docsSize)} / {formatBytes(docsLimit)}
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all" 
                                  style={{ width: `${Math.min(docsPercent, 100)}%` }} 
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {docsBucket?.fileCount || 0} arquivos
                              </p>
                            </div>
                          );
                        })()}
                        
                        {/* Mídia (placeholder for future) */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <Image className="w-3 h-3 text-emerald-500" />
                              Mídia (Imagens/Áudios)
                            </span>
                            <span className="text-muted-foreground">0 B / 1 GB</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '0%' }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">0 arquivos</p>
                        </div>
                      </div>
                    </div>

                    {/* Resumo */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-4">Resumo do Plano</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Usado</span>
                          <span className="font-medium">{formatBytes(storageStats?.totalSize || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limite do Plano</span>
                          <span className="font-medium">{formatBytes(storageStats?.planLimit || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disponível</span>
                          <span className="font-medium text-emerald-500">
                            {formatBytes((storageStats?.planLimit || 0) - (storageStats?.totalSize || 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total de Arquivos</span>
                          <span className="font-medium">{storageStats?.totalFiles || 0}</span>
                        </div>
                        <div className="pt-3 border-t">
                          {(() => {
                            const usagePercent = storageStats?.planLimit 
                              ? ((storageStats.totalSize / storageStats.planLimit) * 100).toFixed(1) 
                              : '0';
                            return (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Uso Total</span>
                                  <span className="font-medium">{usagePercent}%</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden mt-2">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      parseFloat(usagePercent) > 80 ? 'bg-destructive' : 
                                      parseFloat(usagePercent) > 50 ? 'bg-amber-500' : 'bg-primary'
                                    }`} 
                                    style={{ width: `${Math.min(parseFloat(usagePercent), 100)}%` }} 
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium mb-2">Previsão de Uso</h3>
                    {(() => {
                      const usagePercent = storageStats?.planLimit 
                        ? (storageStats.totalSize / storageStats.planLimit) * 100 
                        : 0;
                      const monthsLeft = usagePercent > 0 
                        ? Math.floor((100 - usagePercent) / usagePercent * 12)
                        : null;
                      
                      if (usagePercent === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Você ainda não utilizou nenhum armazenamento. Comece a fazer upload de documentos para seus assistentes IA.
                          </p>
                        );
                      }
                      
                      return (
                        <p className="text-sm text-muted-foreground">
                          Com base no seu uso atual ({usagePercent.toFixed(1)}%), você precisará de mais armazenamento em aproximadamente{' '}
                          <strong className="text-foreground">
                            {monthsLeft && monthsLeft > 0 ? `${monthsLeft} meses` : 'breve'}
                          </strong>.
                        </p>
                      );
                    })()}
                    <Button variant="outline" className="mt-3">
                      Aumentar Armazenamento
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}


          {activeTab === "perfil" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Perfil do Usuário</h2>
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="mt-2" />
                </div>
                <div>
                  <Label>ID do Usuário</Label>
                  <Input value={user?.id || ""} disabled className="mt-2" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Para alterar seu email ou senha, use as configurações de autenticação do Supabase.
                </p>
              </div>
            </Card>
          )}

          {activeTab === "apikeys" && (
            <Suspense fallback={<SettingsSectionFallback />}>
              <AISettingsSection />
            </Suspense>
          )}

          {activeTab === "webhooks" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Webhooks</h2>
              <p className="text-muted-foreground mb-4">
                Configure webhooks para receber notificações em tempo real sobre eventos do sistema.
              </p>
              <div className="space-y-4">
                <div>
                  <Label>URL do Webhook</Label>
                  <Input placeholder="https://seu-servidor.com/webhook" className="mt-2" />
                </div>
                <Button>Adicionar Webhook</Button>
              </div>
            </Card>
          )}

          {activeTab === "voz" && (
            <Suspense fallback={<SettingsSectionFallback />}>
              <ElevenLabsSettingsSection />
            </Suspense>
          )}



          {activeTab === "integracoes" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Integrações</h2>
              
              <div className="space-y-4">
                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">WhatsApp Evolution</h3>
                    <Badge className={settings?.whatsapp_status === 'online' ? "bg-emerald-500" : "bg-muted"}>
                      {settings?.whatsapp_status === 'online' ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte sua conta Evolution para enviar e receber mensagens pelo WhatsApp
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="instance">Instance ID</Label>
                      <Input 
                        id="instance" 
                        value={whatsappInstanceId}
                        onChange={(e) => setWhatsappInstanceId(e.target.value)}
                        placeholder="Seu Instance ID" 
                        className="mt-2" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="token">Token</Label>
                      <Input 
                        id="token" 
                        type="password" 
                        value={whatsappToken}
                        onChange={(e) => setWhatsappToken(e.target.value)}
                        placeholder="Seu Token" 
                        className="mt-2" 
                      />
                    </div>
                  </div>
                  <Button 
                    className="mt-4 bg-primary hover:bg-primary/90"
                    onClick={handleConnectWhatsApp}
                  >
                    {settings?.whatsapp_status === 'online' ? 'Atualizar' : 'Conectar'} WhatsApp
                  </Button>
                </Card>
              </div>
            </Card>
          )}


          {activeTab === "politicas" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Políticas e Conformidade</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Visualize a Política de Privacidade, os Termos de Serviço e a página de Exclusão de Dados.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-5 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <h3 className="font-semibold text-foreground">Política de Privacidade</h3>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Descreve como coletamos, usamos e protegemos suas informações pessoais.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => window.open(`${window.location.origin}/politica-de-privacidade`, '_blank')}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Abrir em nova aba
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPrivacyDialog(true)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-5 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-primary" />
                    <h3 className="font-semibold text-foreground">Termos de Serviço</h3>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Define as regras e condições de uso da plataforma.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => window.open(`${window.location.origin}/termos-de-servico`, '_blank')}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Abrir em nova aba
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowTermsDialog(true)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-5 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <Trash2 className="w-6 h-6 text-destructive" />
                    <h3 className="font-semibold text-foreground">Exclusão de Dados</h3>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Página para usuários solicitarem a exclusão de seus dados pessoais (LGPD/Meta).
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => window.open(`${window.location.origin}/exclusao-de-dados`, '_blank')}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Abrir em nova aba
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Privacy Policy Dialog */}
          {showPrivacyDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPrivacyDialog(false)}>
              <div className="bg-background border rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Política de Privacidade</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowPrivacyDialog(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[70vh] p-6">
                  <Suspense fallback={<SettingsSectionFallback />}>
                    <PrivacyPolicyContent />
                  </Suspense>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Terms of Service Dialog */}
          {showTermsDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTermsDialog(false)}>
              <div className="bg-background border rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Termos de Serviço</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowTermsDialog(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[70vh] p-6">
                  <Suspense fallback={<SettingsSectionFallback />}>
                    <TermsOfServiceContent />
                  </Suspense>
                </ScrollArea>
              </div>
            </div>
          )}

          {activeTab === "plano" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Plano Atual</h2>
              <div className="space-y-4">
                <div className="p-6 border-2 border-primary rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">
                      {plan?.name === "Business" || plan?.id === "business"
                        ? "Plano Business"
                        : plan?.name === "Start" || plan?.id === "start"
                        ? "Plano Start"
                        : plan?.name || "Plano Livre"}
                    </h3>
                    <Badge className="bg-primary text-white">Ativo</Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(plan?.id === "business" || plan?.name === "Business") ? (
                      <>
                        <li>✓ Atendentes, conexões, agentes e fluxos ilimitados</li>
                        <li>✓ Disparos e contatos ilimitados</li>
                        <li>✓ Vendas e cobranças ilimitadas</li>
                        <li>✓ Prospecção (Google Maps, Instagram, TikTok, Espionar Anúncios)</li>
                        <li>✓ Chat interno e integrações avançadas</li>
                        <li>✓ Suporte prioritário</li>
                      </>
                    ) : (
                      <>
                        <li>✓ 5 atendentes / 2 conexões WhatsApp</li>
                        <li>✓ 100 disparos e 500 contatos por mês</li>
                        <li>✓ 3 agentes de IA e 3 fluxos</li>
                        <li>✓ Chat interno e relatórios</li>
                      </>
                    )}
                  </ul>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate("/account")}>
                  Gerenciar Assinatura
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
