import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Save, Settings, Trash2, Plus, Bot, FileText, Upload, X, Check, AlertCircle, Code, Globe, Mail, Calendar, Zap, Ticket, Eye, Mic, Volume2, Workflow, Info } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { useAgentDocuments } from "@/hooks/useAgentDocuments";
import { useAgentFunctions, FUNCTION_TYPES, type FunctionVariable } from "@/hooks/useAgentFunctions";
import { useAIProviderKeys } from "@/hooks/useAIProviderKeys";
import { useFlows } from "@/hooks/useFlows";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { FeatureGate } from "@/components/FeatureGate";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// All available AI models
const aiModels = [
  // Lovable AI Gateway models (always available)
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "lovable" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "lovable" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "lovable" },
  { value: "openai/gpt-5", label: "GPT-5", provider: "lovable" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "lovable" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "lovable" },
  // Direct OpenAI models (requires user's OpenAI API key)
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "openai" },
  // Direct Google Gemini models (requires user's Google API key)
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "google" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "google" },
];

// ElevenLabs voice options
const voiceOptions = [
  { value: "pFZP5JQG7iQjIQuC4Bku", label: "Lily (Feminina)", description: "Voz natural e amigável" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (Feminina)", description: "Profissional e clara" },
  { value: "FGY2WhTYpPnrIDTdsKH5", label: "Laura (Feminina)", description: "Suave e acolhedora" },
  { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda (Feminina)", description: "Elegante e expressiva" },
  { value: "cgSgspJ2msm6clMCkdW9", label: "Jessica (Feminina)", description: "Jovem e dinâmica" },
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "George (Masculina)", description: "Madura e confiante" },
  { value: "N2lVS1w4EtoT3dr4eOWO", label: "Callum (Masculina)", description: "Jovem e animada" },
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (Masculina)", description: "Profissional e assertiva" },
  { value: "cjVigY5qzO86Huf0OWal", label: "Eric (Masculina)", description: "Amigável e casual" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian (Masculina)", description: "Séria e formal" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (Masculina)", description: "Calma e articulada" },
];

const functionIcons: Record<string, any> = {
  automation_ura: Workflow,
  open_ai_ticket: Ticket,
  crm_query: Globe,
  create_task: Check,
  http_request: Code,
  send_email: Mail,
  schedule_meeting: Calendar,
  custom: Zap,
};

const AgentsContent = () => {
  const navigate = useNavigate();
  const { agents, isLoading, updateAgent, deleteAgent, createAgent } = useAgents();
  const { isProviderAvailable } = useAIProviderKeys();
  const { flows } = useFlows();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFunctionDialog, setShowFunctionDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter automation URAs
  const automationFlows = flows.filter((flow: any) => {
    const flowJson = flow.flow_data;
    return flowJson?.type === 'automation';
  });
  
  // Hooks for documents and functions
  const { documents, uploadDocument, deleteDocument } = useAgentDocuments(selectedAgent);
  const { functions, createFunction, deleteFunction, toggleFunction } = useAgentFunctions(selectedAgent);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    signature: "",
    model: "google/gemini-2.5-flash",
    systemPrompt: "",
    outputMarkers: "",
    temperature: 0.7,
    responseStyle: "friendly",
    behavior: "reactive",
    // Voice settings
    voiceEnabled: false,
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    voiceStability: 0.5,
    voiceSimilarity: 0.75,
    voiceSpeed: 1.0,
    // Knowledge & capabilities
    knowledgeText: "",
    canUnderstandImages: false,
    canUnderstandAudio: false,
    canSendImages: false,
    aiProviderForVision: "gemini",
    aiProviderForAudio: "gemini",
  });

  // New function form state
  const [newFunction, setNewFunction] = useState({
    name: "",
    description: "",
    function_type: "automation_ura",
    config: {} as Record<string, any>,
  });
  
  // Function variables state
  const [functionVariables, setFunctionVariables] = useState<FunctionVariable[]>([]);
  
  const addVariable = () => {
    setFunctionVariables([...functionVariables, { name: '', description: '', type: 'string', required: true }]);
  };
  
  const updateVariable = (index: number, field: keyof FunctionVariable, value: any) => {
    const updated = [...functionVariables];
    updated[index] = { ...updated[index], [field]: value };
    setFunctionVariables(updated);
  };
  
  const removeVariable = (index: number) => {
    setFunctionVariables(functionVariables.filter((_, i) => i !== index));
  };

  const currentAgent = agents.find(a => a.id === selectedAgent);

  useEffect(() => {
    if (currentAgent) {
      const agentData = currentAgent as any;
      setFormData({
        name: currentAgent.name || "",
        signature: agentData.signature || "",
        model: agentData.model || "google/gemini-2.5-flash",
        systemPrompt: currentAgent.system_prompt || "",
        outputMarkers: "",
        temperature: currentAgent.temperature || 0.7,
        responseStyle: (currentAgent as any).response_style || "friendly",
        behavior: (currentAgent as any).behavior || "reactive",
        voiceEnabled: agentData.voice_enabled || false,
        voiceId: agentData.voice_id || "pFZP5JQG7iQjIQuC4Bku",
        voiceStability: agentData.voice_stability ?? 0.5,
        voiceSimilarity: agentData.voice_similarity ?? 0.75,
        voiceSpeed: agentData.voice_speed ?? 1.0,
        knowledgeText: agentData.knowledge_text || "",
        canUnderstandImages: agentData.can_understand_images || false,
        canUnderstandAudio: agentData.can_understand_audio || false,
        canSendImages: agentData.can_send_images || false,
        aiProviderForVision: agentData.ai_provider_for_vision || "gemini",
        aiProviderForAudio: agentData.ai_provider_for_audio || "gemini",
      });
    }
  }, [currentAgent]);

  const resetForm = () => {
    setFormData({
      name: "",
      signature: "",
      model: "google/gemini-2.5-flash",
      systemPrompt: "",
      outputMarkers: "",
      temperature: 0.7,
      responseStyle: "friendly",
      behavior: "reactive",
      voiceEnabled: false,
      voiceId: "pFZP5JQG7iQjIQuC4Bku",
      voiceStability: 0.5,
      voiceSimilarity: 0.75,
      voiceSpeed: 1.0,
      knowledgeText: "",
      canUnderstandImages: false,
      canUnderstandAudio: false,
      canSendImages: false,
      aiProviderForVision: "gemini",
      aiProviderForAudio: "gemini",
    });
  };

  const handleCreateNew = () => {
    setSelectedAgent(null);
    setIsCreating(true);
    resetForm();
    setFormData(prev => ({ ...prev, name: "Novo assistente" }));
  };

  const handleBack = () => {
    setSelectedAgent(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Por favor, preencha o nome do assistente");
      return;
    }

    // Check if selected model's provider is available
    const selectedModel = aiModels.find(m => m.value === formData.model);
    if (selectedModel && !isProviderAvailable(selectedModel.provider)) {
      toast.error(`Configure a chave de API do provedor ${selectedModel.provider} em Configurações → IA`);
      return;
    }

    try {
      if (isCreating) {
        const result = await createAgent.mutateAsync({
          name: formData.name,
          platform: "whatsapp",
          system_prompt: formData.systemPrompt,
          temperature: formData.temperature,
          response_style: formData.responseStyle,
          behavior: formData.behavior,
          model: formData.model,
          signature: formData.signature,
          status: 'active',
          voice_enabled: formData.voiceEnabled,
          voice_id: formData.voiceId,
          voice_stability: formData.voiceStability,
          voice_similarity: formData.voiceSimilarity,
          voice_speed: formData.voiceSpeed,
          knowledge_text: formData.knowledgeText,
          can_understand_images: formData.canUnderstandImages,
          can_understand_audio: formData.canUnderstandAudio,
          can_send_images: formData.canSendImages,
          ai_provider_for_vision: formData.aiProviderForVision,
          ai_provider_for_audio: formData.aiProviderForAudio,
        });
        setIsCreating(false);
        setSelectedAgent(result?.id || null);
      } else if (selectedAgent) {
        await updateAgent.mutateAsync({
          id: selectedAgent,
          updates: {
            name: formData.name,
            system_prompt: formData.systemPrompt,
            temperature: formData.temperature,
            response_style: formData.responseStyle,
            behavior: formData.behavior,
            model: formData.model,
            signature: formData.signature,
            voice_enabled: formData.voiceEnabled,
            voice_id: formData.voiceId,
            voice_stability: formData.voiceStability,
            voice_similarity: formData.voiceSimilarity,
            voice_speed: formData.voiceSpeed,
            knowledge_text: formData.knowledgeText,
            can_understand_images: formData.canUnderstandImages,
            can_understand_audio: formData.canUnderstandAudio,
            can_send_images: formData.canSendImages,
            ai_provider_for_vision: formData.aiProviderForVision,
            ai_provider_for_audio: formData.aiProviderForAudio,
          }
        });
      }
    } catch (error) {
      console.error('Erro ao salvar assistente:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedAgent) {
      await deleteAgent.mutateAsync(selectedAgent);
      handleBack();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAgent) return;

    await uploadDocument.mutateAsync({ file, agentId: selectedAgent });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateFunction = async () => {
    if (!selectedAgent || !newFunction.name) {
      toast.error("Preencha o nome da função");
      return;
    }

    // Include variables in config
    const configWithVariables = {
      ...newFunction.config,
      variables: functionVariables.filter(v => v.name.trim() !== ''),
    };

    await createFunction.mutateAsync({
      agent_id: selectedAgent,
      name: newFunction.name,
      description: newFunction.description,
      function_type: newFunction.config.uraId ? 'automation_ura' : 'custom',
      config: configWithVariables,
      is_enabled: true,
    });

    setShowFunctionDialog(false);
    setFunctionVariables([]);
    setNewFunction({ name: "", description: "", function_type: "automation_ura", config: {} });
  };

  const getModelAvailability = (model: typeof aiModels[0]) => {
    return isProviderAvailable(model.provider);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show editor when creating or editing
  if (isCreating || selectedAgent) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Editor do assistente</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={createAgent.isPending || updateAgent.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              {createAgent.isPending || updateAgent.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
              <TabsTrigger value="funcoes">Funções</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-6">
              {/* Warning notice */}
              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Aviso sobre o uso de IA Generativa:</p>
                <p>
                  Ao utilizar este recurso, o usuário reconhece e concorda que o conteúdo gerado por estas ferramentas utiliza 
                  Inteligência Artificial generativa e que apesar dos esforços para garantir precisão, segurança e relevância, 
                  a IA pode apresentar informações incorretas, incompletas, alucinações e produzir conteúdo considerado ofensivo 
                  ou inadequado, especialmente em tópicos complexos ou sensíveis.
                </p>
                <p className="mt-2">
                  Essa funcionalidade depende da configuração das chaves de autenticação para os modelos de IA utilizados. 
                  As chaves podem ser configuradas em{" "}
                  <button 
                    onClick={() => navigate('/settings')} 
                    className="text-primary underline hover:no-underline"
                  >
                    Configurações → IA
                  </button>. 
                  Os custos de token são de responsabilidade do usuário.
                </p>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs text-muted-foreground">Nome do assistente</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signature" className="text-xs text-muted-foreground">Assinatura</Label>
                  <Input
                    id="signature"
                    value={formData.signature}
                    onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                    placeholder="Nome exibido nas mensagens"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="model" className="text-xs text-muted-foreground">Modelo de IA</Label>
                  <Select value={formData.model} onValueChange={(v) => setFormData({ ...formData, model: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        Lovable AI (Incluído)
                        <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
                      </div>
                      {aiModels.filter(m => m.provider === "lovable").map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex items-center gap-2">
                            {m.label}
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 mt-2">
                        OpenAI
                        {isProviderAvailable('openai') ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500">Requer API Key</Badge>
                        )}
                      </div>
                      {aiModels.filter(m => m.provider === "openai").map(m => {
                        const available = getModelAvailability(m);
                        return (
                          <SelectItem key={m.value} value={m.value} disabled={!available}>
                            <div className="flex items-center gap-2">
                              {m.label}
                              {available ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-orange-500" />
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 mt-2">
                        Google Gemini
                        {isProviderAvailable('google') ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500">Requer API Key</Badge>
                        )}
                      </div>
                      {aiModels.filter(m => m.provider === "google").map(m => {
                        const available = getModelAvailability(m);
                        return (
                          <SelectItem key={m.value} value={m.value} disabled={!available}>
                            <div className="flex items-center gap-2">
                              {m.label}
                              {available ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-orange-500" />
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="context" className="text-xs text-muted-foreground">Contexto base</Label>
                <Textarea
                  id="context"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="Descreva como o assistente deve se comportar, seu papel, personalidade e instruções específicas..."
                  className="mt-1 min-h-[150px]"
                />
              </div>

              <div>
                <Label htmlFor="markers" className="text-xs text-muted-foreground">Marcadores de saída</Label>
                <Textarea
                  id="markers"
                  value={formData.outputMarkers}
                  onChange={(e) => setFormData({ ...formData, outputMarkers: e.target.value })}
                  placeholder="Defina marcadores para identificar ações ou respostas específicas do assistente..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              {/* Settings gear button */}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações Avançadas
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="conhecimento" className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground">Base de Conhecimento</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione informações e contexto que o assistente pode usar para responder perguntas.
                </p>
              </div>

              <div>
                <Label htmlFor="knowledgeText">Texto de conhecimento</Label>
                <Textarea
                  id="knowledgeText"
                  value={formData.knowledgeText}
                  onChange={(e) => setFormData({ ...formData, knowledgeText: e.target.value })}
                  placeholder="Cole aqui informações sobre sua empresa, produtos, serviços, FAQ, políticas, procedimentos, etc. O assistente usará esse conteúdo como referência para responder..."
                  className="mt-1 min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.knowledgeText.length} caracteres
                </p>
              </div>

              {/* Capability toggles */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium text-foreground">Capacidades Multimídia</h3>
                <p className="text-sm text-muted-foreground">
                  Ative recursos de entendimento de imagem e áudio. Cada recurso usa a API do provedor configurado e será cobrado na conta do cliente.
                </p>

                {/* Image understanding */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Entender Imagens</p>
                      <p className="text-xs text-muted-foreground">O assistente poderá analisar imagens enviadas pelo cliente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={formData.aiProviderForVision}
                      onValueChange={(v) => setFormData({ ...formData, aiProviderForVision: v })}
                      disabled={!formData.canUnderstandImages}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="openai">ChatGPT</SelectItem>
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={formData.canUnderstandImages}
                      onCheckedChange={(v) => setFormData({ ...formData, canUnderstandImages: v })}
                    />
                  </div>
                </div>

                {formData.canUnderstandImages && !isProviderAvailable(formData.aiProviderForVision === 'openai' ? 'openai' : 'google') && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Configure a chave de API do {formData.aiProviderForVision === 'openai' ? 'ChatGPT' : 'Gemini'} em Configurações → IA
                  </div>
                )}

                {/* Audio understanding */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Entender Áudio</p>
                      <p className="text-xs text-muted-foreground">O assistente poderá transcrever e entender áudios enviados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={formData.aiProviderForAudio}
                      onValueChange={(v) => setFormData({ ...formData, aiProviderForAudio: v })}
                      disabled={!formData.canUnderstandAudio}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="openai">ChatGPT</SelectItem>
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={formData.canUnderstandAudio}
                      onCheckedChange={(v) => setFormData({ ...formData, canUnderstandAudio: v })}
                    />
                  </div>
                </div>

                {formData.canUnderstandAudio && !isProviderAvailable(formData.aiProviderForAudio === 'openai' ? 'openai' : 'google') && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Configure a chave de API do {formData.aiProviderForAudio === 'openai' ? 'ChatGPT' : 'Gemini'} em Configurações → IA
                  </div>
                )}

                {/* Send images */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Enviar Imagens</p>
                      <p className="text-xs text-muted-foreground">O assistente poderá enviar imagens para o cliente</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.canSendImages}
                    onCheckedChange={(v) => setFormData({ ...formData, canSendImages: v })}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Os recursos de imagem e áudio utilizam a API do provedor selecionado (Gemini ou ChatGPT). Configure as chaves em <strong>Configurações → IA</strong> para que o custo seja cobrado diretamente na conta do cliente.</span>
              </div>
            </TabsContent>

            <TabsContent value="funcoes" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">Funções Personalizadas</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure funções que o assistente pode executar automaticamente.
                  </p>
                </div>
                <Button onClick={() => setShowFunctionDialog(true)} disabled={!selectedAgent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Função
                </Button>
              </div>

              {functions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    Nenhuma função configurada. Adicione funções para expandir as capacidades do assistente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {functions.map((func) => {
                    const Icon = functionIcons[func.function_type] || Zap;
                    return (
                      <div key={func.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{func.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {FUNCTION_TYPES.find(t => t.value === func.function_type)?.label || func.function_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={func.is_enabled}
                            onCheckedChange={() => toggleFunction.mutate(func.id)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteFunction.mutate(func.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Delete button for existing agents */}
        {selectedAgent && (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Assistente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O assistente e todos os seus documentos e funções serão excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Advanced Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurações Avançadas</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <Label className="text-sm">Temperatura / Criatividade: {formData.temperature.toFixed(1)}</Label>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={(v) => setFormData({ ...formData, temperature: v[0] })}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  className="mt-4"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Menor = mais preciso e consistente | Maior = mais criativo e variado
                </p>
              </div>

              <div>
                <Label htmlFor="style">Estilo de Resposta</Label>
                <Select value={formData.responseStyle} onValueChange={(v) => setFormData({ ...formData, responseStyle: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Amigável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="behavior">Comportamento</Label>
                <Select value={formData.behavior} onValueChange={(v) => setFormData({ ...formData, behavior: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proactive">Proativo</SelectItem>
                    <SelectItem value="reactive">Reativo</SelectItem>
                    <SelectItem value="mixed">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Settings Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Configurações de Voz (IA)</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Responder com Áudio</Label>
                      <p className="text-xs text-muted-foreground">Quando o cliente enviar áudio, a IA responde com áudio</p>
                    </div>
                    <Switch
                      checked={formData.voiceEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, voiceEnabled: checked })}
                    />
                  </div>

                  {formData.voiceEnabled && (
                    <>
                      <div>
                        <Label>Voz do Assistente</Label>
                        <Select value={formData.voiceId} onValueChange={(v) => setFormData({ ...formData, voiceId: v })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Vozes Femininas</div>
                            {voiceOptions.filter(v => v.label.includes("Feminina")).map(voice => (
                              <SelectItem key={voice.value} value={voice.value}>
                                <div className="flex flex-col">
                                  <span>{voice.label.replace(" (Feminina)", "")}</span>
                                  <span className="text-xs text-muted-foreground">{voice.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Vozes Masculinas</div>
                            {voiceOptions.filter(v => v.label.includes("Masculina")).map(voice => (
                              <SelectItem key={voice.value} value={voice.value}>
                                <div className="flex flex-col">
                                  <span>{voice.label.replace(" (Masculina)", "")}</span>
                                  <span className="text-xs text-muted-foreground">{voice.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">Estabilidade: {formData.voiceStability.toFixed(1)}</Label>
                        <Slider
                          value={[formData.voiceStability]}
                          onValueChange={(v) => setFormData({ ...formData, voiceStability: v[0] })}
                          min={0}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Menor = mais expressivo | Maior = mais consistente
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm">Similaridade: {formData.voiceSimilarity.toFixed(2)}</Label>
                        <Slider
                          value={[formData.voiceSimilarity]}
                          onValueChange={(v) => setFormData({ ...formData, voiceSimilarity: v[0] })}
                          min={0}
                          max={1}
                          step={0.05}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Quão próximo da voz original
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm">Velocidade: {formData.voiceSpeed.toFixed(1)}x</Label>
                        <Slider
                          value={[formData.voiceSpeed]}
                          onValueChange={(v) => setFormData({ ...formData, voiceSpeed: v[0] })}
                          min={0.7}
                          max={1.3}
                          step={0.1}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Velocidade da fala
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Function Dialog */}
        <Dialog open={showFunctionDialog} onOpenChange={(open) => {
          setShowFunctionDialog(open);
          if (!open) {
            setFunctionVariables([]);
            setNewFunction({ name: "", description: "", function_type: "automation_ura", config: {} });
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar função do assistente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Name and URA Selection Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="func-name" className="text-xs text-muted-foreground">Nome*</Label>
                  <Input
                    id="func-name"
                    value={newFunction.name}
                    onChange={(e) => setNewFunction({ ...newFunction, name: e.target.value })}
                    placeholder="Nova função"
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">Automação da função</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p className="text-xs">Automação que será executada quando o assistente solicitar essa função.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select 
                    value={newFunction.config.uraId || 'none'} 
                    onValueChange={(v) => setNewFunction({ 
                      ...newFunction, 
                      config: { ...newFunction.config, uraId: v === 'none' ? undefined : v } 
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {automationFlows.map((flow: any) => (
                        <SelectItem key={flow.id} value={flow.id}>
                          {flow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="func-desc" className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea
                  id="func-desc"
                  value={newFunction.description}
                  onChange={(e) => setNewFunction({ ...newFunction, description: e.target.value })}
                  placeholder="Descrição da função"
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Variables Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Variáveis</Label>
                </div>
                
                {functionVariables.length > 0 && (
                  <div className="space-y-2">
                    {functionVariables.map((variable, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Variável {index + 1}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => removeVariable(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={variable.name}
                            onChange={(e) => updateVariable(index, 'name', e.target.value)}
                            placeholder="Nome (ex: motivo)"
                            className="text-sm"
                          />
                          <Select 
                            value={variable.type} 
                            onValueChange={(v) => updateVariable(index, 'type', v as 'string' | 'number' | 'boolean')}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="boolean">Sim/Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          value={variable.description}
                          onChange={(e) => updateVariable(index, 'description', e.target.value)}
                          placeholder="Descrição (ex: motivo do chamado)"
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={variable.required}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`required-${index}`} className="text-xs cursor-pointer">
                            Obrigatório
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addVariable}
                  className="w-full"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar variável
                </Button>

                {functionVariables.length > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Uso no prompt:</strong> Use as variáveis no formato <code className="bg-muted px-1 rounded">{`{{nome_variavel}}`}</code> no prompt do assistente.
                    </p>
                    <div className="mt-2 text-xs font-mono bg-muted p-2 rounded">
                      {functionVariables.map(v => v.name).filter(Boolean).map(name => (
                        <span key={name} className="inline-block mr-2">{`{{${name}}}`}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Execution Rule */}
              <div>
                <Label className="text-xs text-muted-foreground">Regra de execução</Label>
                <Select 
                  value={newFunction.config.executionRule || 'on_demand'} 
                  onValueChange={(v) => setNewFunction({ 
                    ...newFunction, 
                    config: { ...newFunction.config, executionRule: v } 
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_demand">Quando a IA solicitar</SelectItem>
                    <SelectItem value="on_failure">Quando não resolver o problema</SelectItem>
                    <SelectItem value="always">Sempre executar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setShowFunctionDialog(false)}>
                Fechar
              </Button>
              <Button onClick={handleCreateFunction} disabled={createFunction.isPending}>
                {createFunction.isPending ? "Criando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assistentes IA</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus assistentes inteligentes</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Criar Assistente
        </Button>
      </div>

      {/* Agents List */}
      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Nenhum assistente criado</h2>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro assistente IA para automatizar suas conversas
          </p>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Assistente
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <Card 
              key={agent.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
              onClick={() => setSelectedAgent(agent.id)}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {agent.status === "active" ? "Ativo" : "Inativo"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-500" : "bg-muted"}`} />
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent.id); }}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Agents = () => {
  return (
    <FeatureGate feature="ai_agents">
      <AgentsContent />
    </FeatureGate>
  );
};

export default Agents;
