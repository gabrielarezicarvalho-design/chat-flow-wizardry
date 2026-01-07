import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Eye, EyeOff, Check, AlertCircle, Loader2, ExternalLink, Trash2, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIProviderKeys } from "@/hooks/useAIProviderKeys";
import { toast } from "sonner";

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.0-pro", label: "Gemini 1.0 Pro" },
];

export const AISettingsSection = () => {
  const { providerKeys, isLoading, upsertKey, deleteKey, getKeyStatus } = useAIProviderKeys();
  
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savingOpenai, setSavingOpenai] = useState(false);
  
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);

  const [asaasKey, setAsaasKey] = useState("");
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [savingAsaas, setSavingAsaas] = useState(false);

  const openaiStatus = getKeyStatus('openai');
  const geminiStatus = getKeyStatus('google');
  const asaasStatus = getKeyStatus('asaas');

  const handleSaveOpenAI = async () => {
    if (!openaiKey.trim()) {
      toast.error("Insira uma chave de API válida");
      return;
    }
    setSavingOpenai(true);
    try {
      await upsertKey.mutateAsync({ provider: 'openai', apiKey: openaiKey });
      setOpenaiKey("");
    } finally {
      setSavingOpenai(false);
    }
  };

  const handleSaveGemini = async () => {
    if (!geminiKey.trim()) {
      toast.error("Insira uma chave de API válida");
      return;
    }
    setSavingGemini(true);
    try {
      await upsertKey.mutateAsync({ provider: 'google', apiKey: geminiKey });
      setGeminiKey("");
    } finally {
      setSavingGemini(false);
    }
  };

  const handleSaveAsaas = async () => {
    if (!asaasKey.trim()) {
      toast.error("Insira uma chave de API válida");
      return;
    }
    setSavingAsaas(true);
    try {
      await upsertKey.mutateAsync({ provider: 'asaas', apiKey: asaasKey });
      setAsaasKey("");
      toast.success("Chave Asaas salva com sucesso!");
    } finally {
      setSavingAsaas(false);
    }
  };

  const handleRemoveOpenAI = () => {
    deleteKey.mutate('openai');
  };

  const handleRemoveGemini = () => {
    deleteKey.mutate('google');
  };

  const handleRemoveAsaas = () => {
    deleteKey.mutate('asaas');
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Configurações de IA</h2>
      <p className="text-muted-foreground mb-6">
        Configure suas chaves de API para usar modelos de IA externos. Os custos são gerenciados diretamente nas plataformas OpenAI e Google.
      </p>
      
      <div className="space-y-6">
        {/* OpenAI Configuration */}
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">OpenAI (ChatGPT)</h3>
              {openaiStatus.isConfigured && (
                <Badge variant={openaiStatus.isValid ? "default" : "destructive"} className="text-xs">
                  {openaiStatus.isValid ? "Configurado" : "Inválido"}
                </Badge>
              )}
            </div>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Obter chave <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {openaiStatus.isConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">Chave configurada</span>
                  {openaiStatus.lastValidated && (
                    <span className="text-xs text-muted-foreground">
                      (validado em {new Date(openaiStatus.lastValidated).toLocaleDateString('pt-BR')})
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveOpenAI}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>

              <div>
                <Label>Modelo padrão</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>API Key</Label>
                <div className="relative mt-2">
                  <Input
                    type={showOpenaiKey ? "text" : "password"}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>Modelo padrão</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSaveOpenAI} 
                disabled={savingOpenai || !openaiKey.trim()}
                className="w-full"
              >
                {savingOpenai && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Chave OpenAI
              </Button>
            </div>
          )}
        </div>

        {/* Gemini Configuration */}
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Google Gemini</h3>
              {geminiStatus.isConfigured && (
                <Badge variant={geminiStatus.isValid ? "default" : "destructive"} className="text-xs">
                  {geminiStatus.isValid ? "Configurado" : "Inválido"}
                </Badge>
              )}
            </div>
            <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Obter chave <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {geminiStatus.isConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">Chave configurada</span>
                  {geminiStatus.lastValidated && (
                    <span className="text-xs text-muted-foreground">
                      (validado em {new Date(geminiStatus.lastValidated).toLocaleDateString('pt-BR')})
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveGemini}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>

              <div>
                <Label>Modelo padrão</Label>
                <Select value={geminiModel} onValueChange={setGeminiModel}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>API Key</Label>
                <div className="relative mt-2">
                  <Input
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>Modelo padrão</Label>
                <Select value={geminiModel} onValueChange={setGeminiModel}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSaveGemini} 
                disabled={savingGemini || !geminiKey.trim()}
                className="w-full"
              >
                {savingGemini && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Chave Gemini
              </Button>
            </div>
          )}
        </div>

        {/* Asaas Configuration */}
        <div className="p-4 border rounded-lg space-y-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold">Asaas (Cobranças)</h3>
              {asaasStatus.isConfigured && (
                <Badge variant={asaasStatus.isValid ? "default" : "destructive"} className="text-xs">
                  {asaasStatus.isValid !== false ? "Configurado" : "Inválido"}
                </Badge>
              )}
            </div>
            <a 
              href="https://www.asaas.com/minhaConta/integracoes/apiKey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Obter chave <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            Configure sua API do Asaas para enviar faturas e boletos automaticamente via fluxos de automação.
          </p>

          {asaasStatus.isConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">Chave configurada</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveAsaas}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>API Key Asaas</Label>
                <div className="relative mt-2">
                  <Input
                    type={showAsaasKey ? "text" : "password"}
                    value={asaasKey}
                    onChange={(e) => setAsaasKey(e.target.value)}
                    placeholder="$aact_..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAsaasKey(!showAsaasKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAsaasKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use a chave de produção ($aact_...) ou sandbox ($aact_...)
                </p>
              </div>

              <Button 
                onClick={handleSaveAsaas} 
                disabled={savingAsaas || !asaasKey.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {savingAsaas && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Chave Asaas
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Gerenciamento de custos</p>
              <p>Os custos de uso são gerenciados diretamente nas plataformas. Acesse:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li><a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Usage Dashboard</a></li>
                <li><a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Billing</a></li>
                <li><a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Asaas Dashboard</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
