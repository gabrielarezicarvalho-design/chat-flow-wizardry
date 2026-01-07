import { useState } from 'react';
import { useSmartForms, SmartForm, SmartFormField } from '@/hooks/useSmartForms';
import { useDepartments } from '@/hooks/useDepartments';
import { useConnections } from '@/hooks/useConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeatureGate } from "@/components/FeatureGate";
import { 
  Plus, 
  FileText, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  Clock,
  Building2,
  Link as LinkIcon,
  Layers,
  MessageCircle,
  Send,
  Terminal,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const fieldTypes = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'address', label: 'Endereço' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção' },
];

const formTemplates = [
  {
    name: 'Fora do Horário',
    icon: '🌙',
    description: 'Captura de leads fora do expediente',
    welcome_message: 'Olá! Estamos fora do horário comercial. Preencha o formulário abaixo e entraremos em contato assim que possível.',
    success_message: 'Obrigado! Recebemos suas informações e entraremos em contato em breve.',
    fields: [
      { name: 'nome', label: 'Nome completo', type: 'text' as const, required: true, placeholder: 'Digite seu nome' },
      { name: 'telefone', label: 'Telefone para contato', type: 'phone' as const, required: true, placeholder: '(11) 99999-9999' },
      { name: 'endereco', label: 'Endereço', type: 'address' as const, required: false, placeholder: 'Rua, número, bairro, cidade' },
      { name: 'melhor_horario', label: 'Melhor horário para contato', type: 'text' as const, required: false, placeholder: 'Ex: Manhã, Tarde, Noite' },
    ]
  },
  {
    name: 'Financeiro',
    icon: '💰',
    description: 'Solicitações do setor financeiro',
    welcome_message: 'Olá! Para atendimento do setor financeiro, preencha o formulário abaixo.',
    success_message: 'Recebemos sua solicitação! Nossa equipe financeira entrará em contato em até 24h.',
    fields: [
      { name: 'nome', label: 'Nome completo', type: 'text' as const, required: true, placeholder: 'Digite seu nome' },
      { name: 'cpf', label: 'CPF', type: 'cpf' as const, required: true, placeholder: '000.000.000-00' },
      { name: 'telefone', label: 'Telefone', type: 'phone' as const, required: true, placeholder: '(11) 99999-9999' },
      { name: 'email', label: 'Email', type: 'email' as const, required: true, placeholder: 'seu@email.com' },
      { name: 'assunto', label: 'Assunto', type: 'text' as const, required: true, placeholder: 'Ex: Boleto, Pagamento, Reembolso' },
    ]
  },
  {
    name: 'Suporte Técnico',
    icon: '🔧',
    description: 'Solicitações de suporte',
    welcome_message: 'Olá! Para abrir um chamado de suporte, preencha as informações abaixo.',
    success_message: 'Chamado registrado! Nossa equipe de suporte entrará em contato em breve.',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text' as const, required: true, placeholder: 'Digite seu nome' },
      { name: 'telefone', label: 'Telefone', type: 'phone' as const, required: true, placeholder: '(11) 99999-9999' },
      { name: 'email', label: 'Email', type: 'email' as const, required: false, placeholder: 'seu@email.com' },
      { name: 'problema', label: 'Descreva o problema', type: 'text' as const, required: true, placeholder: 'Descreva detalhadamente o problema' },
    ]
  },
  {
    name: 'Comercial',
    icon: '🛒',
    description: 'Leads comerciais e vendas',
    welcome_message: 'Olá! Ficamos felizes com seu interesse! Preencha o formulário para nossa equipe comercial entrar em contato.',
    success_message: 'Perfeito! Um de nossos consultores entrará em contato em breve.',
    fields: [
      { name: 'nome', label: 'Nome completo', type: 'text' as const, required: true, placeholder: 'Digite seu nome' },
      { name: 'empresa', label: 'Empresa', type: 'text' as const, required: false, placeholder: 'Nome da empresa' },
      { name: 'telefone', label: 'Telefone', type: 'phone' as const, required: true, placeholder: '(11) 99999-9999' },
      { name: 'email', label: 'Email', type: 'email' as const, required: true, placeholder: 'seu@email.com' },
      { name: 'interesse', label: 'Interesse', type: 'text' as const, required: true, placeholder: 'Qual produto/serviço você procura?' },
    ]
  },
];

const SmartFormsContent = () => {
  const { forms, isLoadingForms, createForm, updateForm, deleteForm } = useSmartForms();
  const { departments } = useDepartments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<SmartForm | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    welcome_message: 'Olá! Preencha o formulário abaixo:',
    success_message: 'Obrigado! Sua solicitação foi registrada.',
    whatsapp_confirmation: true,
    is_active: true,
    fields: [] as SmartFormField[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      department_id: '',
      welcome_message: 'Olá! Preencha o formulário abaixo:',
      success_message: 'Obrigado! Sua solicitação foi registrada.',
      whatsapp_confirmation: true,
      is_active: true,
      fields: [],
    });
    setEditingForm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.fields.length === 0) {
      toast.error('Adicione pelo menos um campo ao formulário');
      return;
    }

    const submitData = {
      ...formData,
      department_id: formData.department_id || null,
    };

    if (editingForm) {
      await updateForm.mutateAsync({ id: editingForm.id, updates: submitData });
    } else {
      await createForm.mutateAsync(submitData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (form: SmartForm) => {
    setEditingForm(form);
    setFormData({
      name: form.name,
      department_id: form.department_id || '',
      welcome_message: form.welcome_message,
      success_message: form.success_message,
      whatsapp_confirmation: form.whatsapp_confirmation,
      is_active: form.is_active,
      fields: form.fields,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este formulário?')) {
      await deleteForm.mutateAsync(id);
    }
  };

  const handleDuplicate = async (form: SmartForm) => {
    await createForm.mutateAsync({
      name: `${form.name} (Cópia)`,
      department_id: form.department_id,
      welcome_message: form.welcome_message,
      success_message: form.success_message,
      whatsapp_confirmation: form.whatsapp_confirmation,
      is_active: false,
      fields: form.fields,
    });
  };

  const handleUseTemplate = (template: typeof formTemplates[0]) => {
    setFormData({
      name: template.name,
      department_id: '',
      welcome_message: template.welcome_message,
      success_message: template.success_message,
      whatsapp_confirmation: true,
      is_active: true,
      fields: template.fields,
    });
    setTemplateDialogOpen(false);
    setDialogOpen(true);
  };

  const addField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { name: '', label: '', type: 'text', required: true, placeholder: '' }],
    });
  };

  const updateField = (index: number, updates: Partial<SmartFormField>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index: number) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index),
    });
  };

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<SmartForm | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testForm, setTestForm] = useState<SmartForm | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testLogs, setTestLogs] = useState<Array<{time: string, type: 'info' | 'success' | 'error', message: string}>>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const { connections } = useConnections();

  // URL base fixa - mesma usada na Edge Function
  const FIXED_BASE_URL = 'https://ia.marketflowchat.com.br';
  
  // URL do formulário fixo (pelo ID)
  const getFormBaseUrl = () => `${FIXED_BASE_URL}/formulario`;
  
  // URL do formulário dinâmico (pelo token) - gerado pela Edge Function
  const getTokenBaseUrl = () => `${FIXED_BASE_URL}/f`;

  const copyFormLink = (form: SmartForm) => {
    const formUrl = `${getFormBaseUrl()}/${form.id}`;
    navigator.clipboard.writeText(formUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  const handlePreview = (form: SmartForm) => {
    setPreviewForm(form);
    setPreviewDialogOpen(true);
  };

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setTestLogs(prev => [...prev, { time, type, message }]);
  };

  const handleTestForm = (form: SmartForm) => {
    setTestForm(form);
    setTestPhone('');
    setTestLogs([]);
    setGeneratedUrl('');
    setTestDialogOpen(true);
  };

  const runTest = async () => {
    if (!testForm || !testPhone) {
      toast.error('Preencha o número de telefone');
      return;
    }

    setIsTesting(true);
    setTestLogs([]);
    setGeneratedUrl('');

    try {
      addLog('info', '🚀 Iniciando teste de geração de link...');
      addLog('info', `📋 Form ID: ${testForm.id}`);
      addLog('info', `📞 Telefone: ${testPhone}`);
      addLog('info', `🔗 Base URL esperada: ${FIXED_BASE_URL}`);

      // Buscar primeira conexão ativa
      const activeConnection = connections.find(c => c.status === 'connected');
      addLog('info', `🔌 Conexão ativa: ${activeConnection?.name || 'Nenhuma'}`);

      // Chamar Edge Function para gerar link
      addLog('info', '📡 Chamando smart-form-generate...');
      
      const { data, error } = await supabase.functions.invoke('smart-form-generate', {
        body: {
          form_id: testForm.id,
          phone: testPhone.replace(/\D/g, ''),
          connection_id: activeConnection?.id || null,
          conversation_id: null,
          check_business_hours: false,
          user_id: null
        }
      });

      if (error) {
        addLog('error', `❌ Erro na Edge Function: ${error.message}`);
        throw error;
      }

      addLog('success', '✅ Resposta recebida da Edge Function');
      addLog('info', `📦 Dados: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        addLog('success', `🎉 Link gerado: ${data.form_url}`);
        setGeneratedUrl(data.form_url);
        
        // Verificar se a URL está correta
        if (data.form_url.includes('ia.marketflowchat.com.br/f/')) {
          addLog('success', '✅ URL está no formato correto!');
        } else {
          addLog('error', `⚠️ URL em formato inesperado: ${data.form_url}`);
        }
        
        addLog('info', `🎫 Token: ${data.token}`);
        addLog('info', `📝 Submission ID: ${data.submission_id}`);
      } else {
        addLog('error', `❌ Falha: ${data.error || 'Erro desconhecido'}`);
      }

    } catch (err: any) {
      addLog('error', `❌ Exceção: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoadingForms) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Smart Forms</h1>
          <p className="text-muted-foreground mt-1">
            Formulários inteligentes com link público para captura de leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
            <Layers className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Button>
        </div>
      </div>

      {/* Forms Grid */}
      {forms.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum Smart Form criado</h3>
          <p className="text-muted-foreground mb-4">
            Crie formulários inteligentes para capturar leads fora do horário comercial
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              <Layers className="w-4 h-4 mr-2" />
              Usar Template
            </Button>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Criar do Zero
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card key={form.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{form.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {form.fields.length} campos
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(form)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(form)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyFormLink(form)}>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Copiar Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreview(form)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTestForm(form)}>
                        <Terminal className="h-4 w-4 mr-2" />
                        Testar Geração
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(form.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={form.is_active ? "default" : "secondary"}>
                    {form.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {form.whatsapp_confirmation && (
                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                      WhatsApp ✓
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>
                      {form.department_id 
                        ? departments.find(d => d.id === form.department_id)?.name || 'Departamento'
                        : 'Sem departamento'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Campos:</p>
                  <div className="flex flex-wrap gap-1">
                    {form.fields.slice(0, 4).map((field, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {field.label || field.name}
                      </Badge>
                    ))}
                    {form.fields.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{form.fields.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? 'Editar Smart Form' : 'Novo Smart Form'}</DialogTitle>
            <DialogDescription>
              Configure o formulário público para captura de leads
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Formulário *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Contato Fora do Horário"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
              <Select 
                  value={formData.department_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, department_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mensagem de Boas-vindas</Label>
                <Textarea
                  value={formData.welcome_message}
                  onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                  placeholder="Mensagem exibida no topo do formulário"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Sucesso</Label>
                <Textarea
                  value={formData.success_message}
                  onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
                  placeholder="Mensagem exibida após envio"
                  rows={2}
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.whatsapp_confirmation}
                  onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_confirmation: checked })}
                />
                <Label className="cursor-pointer">Enviar confirmação via WhatsApp</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="cursor-pointer">Formulário ativo</Label>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Campos do Formulário</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Campo
                </Button>
              </div>
              
              {formData.fields.length === 0 ? (
                <Card className="p-6 text-center bg-muted/50">
                  <p className="text-muted-foreground">Nenhum campo adicionado</p>
                  <Button type="button" variant="link" onClick={addField}>
                    Adicionar primeiro campo
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {formData.fields.map((field, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-3">
                          <Label className="text-xs">Nome (interno)</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            placeholder="nome_campo"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Label (exibido)</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Nome do Campo"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Tipo</Label>
                          <Select 
                            value={field.type} 
                            onValueChange={(v) => updateField(index, { type: v as SmartFormField['type'] })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Dica..."
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1 flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(index, { required: checked })}
                          />
                          <span className="text-xs">Obrig.</span>
                        </div>
                        <div className="col-span-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeField(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createForm.isPending || updateForm.isPending}>
                {editingForm ? 'Salvar Alterações' : 'Criar Formulário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Templates de Smart Forms</DialogTitle>
            <DialogDescription>
              Escolha um template pré-configurado para começar rapidamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {formTemplates.map((template, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleUseTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.fields.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link do Formulário</DialogTitle>
            <DialogDescription>
              Copie o link abaixo para compartilhar o formulário
            </DialogDescription>
          </DialogHeader>
          
          {previewForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>URL Fixa do Formulário (pelo ID)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`${getFormBaseUrl()}/${previewForm.id}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={() => copyFormLink(previewForm)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use esta URL para um link permanente ao formulário
                </p>
              </div>

              <div className="space-y-2">
                <Label>Visualizar Formulário</Label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(`/formulario/${previewForm.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir Prévia do Formulário
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Informações do Formulário:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Nome:</strong> {previewForm.name}</p>
                  <p><strong>Campos:</strong> {previewForm.fields.length}</p>
                  <p><strong>Status:</strong> {previewForm.is_active ? 'Ativo' : 'Inativo'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Generation Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Testar Geração de Link
            </DialogTitle>
            <DialogDescription>
              Teste a geração do link do formulário e veja o preview do WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          {testForm && (
            <div className="grid grid-cols-2 gap-6">
              {/* Left side - Test controls and logs */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Telefone de Teste</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="5511999999999"
                      className="font-mono"
                    />
                    <Button onClick={runTest} disabled={isTesting}>
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Console Logs */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Console de Debug
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-lg bg-slate-950 p-3">
                    {testLogs.length === 0 ? (
                      <p className="text-slate-500 text-sm font-mono">
                        Execute o teste para ver os logs...
                      </p>
                    ) : (
                      <div className="space-y-1 font-mono text-xs">
                        {testLogs.map((log, i) => (
                          <div 
                            key={i} 
                            className={`flex gap-2 ${
                              log.type === 'error' ? 'text-red-400' :
                              log.type === 'success' ? 'text-green-400' :
                              'text-slate-300'
                            }`}
                          >
                            <span className="text-slate-500">[{log.time}]</span>
                            <span className="break-all whitespace-pre-wrap">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Generated URL */}
                {generatedUrl && (
                  <div className="space-y-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Label className="text-green-500 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      URL Gerada
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        value={generatedUrl}
                        readOnly
                        className="font-mono text-xs bg-transparent border-green-500/30"
                      />
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedUrl);
                          toast.success('URL copiada!');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right side - WhatsApp Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Preview WhatsApp
                </Label>
                <div className="border rounded-lg overflow-hidden bg-[#e5ddd5]">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] text-white p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Sua Empresa</p>
                      <p className="text-xs opacity-80">online</p>
                    </div>
                  </div>
                  
                  {/* Chat area */}
                  <div className="p-4 min-h-[300px] space-y-3">
                    {/* Bot message with form link */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-sm">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {testForm.welcome_message || 'Olá! Preencha o formulário abaixo:'}
                        </p>
                        {generatedUrl ? (
                          <a 
                            href={generatedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 underline break-all mt-2 block"
                          >
                            {generatedUrl}
                          </a>
                        ) : (
                          <p className="text-sm text-blue-600 mt-2">
                            🔗 {getTokenBaseUrl()}/[token]
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 text-right mt-1">
                          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Expected form fields preview */}
                    <div className="bg-amber-100 rounded-lg p-3 border border-amber-300">
                      <p className="text-xs font-medium text-amber-800 mb-2">
                        📋 Campos do formulário:
                      </p>
                      <div className="text-xs text-amber-700 space-y-1">
                        {testForm.fields.map((field, i) => (
                          <p key={i}>
                            • {field.label} ({field.type}){field.required ? ' *' : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SmartForms = () => {
  return (
    <FeatureGate feature="smart_forms">
      <SmartFormsContent />
    </FeatureGate>
  );
};

export default SmartForms;
