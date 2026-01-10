import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Trash2, GripVertical, Users, User, ChevronRight } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAllDepartments } from '@/hooks/useAllDepartments';
import { useSmartForms } from '@/hooks/useSmartForms';
import { useAgents } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface NodeEditorNewProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export const NodeEditorNew = ({ node, onUpdate, onClose }: NodeEditorNewProps) => {
  const [nodeData, setNodeData] = useState<any>({});
  const { departments } = useAllDepartments();
  const { forms } = useSmartForms();
  const { agents } = useAgents();
  
  // Buscar atendentes humanos
  const { data: humanAgents = [] } = useQuery({
    queryKey: ['human-agents-for-flow-new'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];
      
      const userIds = roles.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, is_online')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      return (profiles || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || p.username || 'Atendente',
        isOnline: p.is_online
      }));
    }
  });

  useEffect(() => {
    if (node) {
      setNodeData(node.data || {});
    }
  }, [node]);

  if (!node) return null;

  const handleUpdate = (key: string, value: any) => {
    const newData = { ...nodeData, [key]: value };
    setNodeData(newData);
    onUpdate(node.id, newData);
  };

  const addButton = () => {
    const buttons = nodeData.buttons || [];
    handleUpdate('buttons', [...buttons, { id: Date.now().toString(), text: '', value: '' }]);
  };

  const updateButton = (index: number, key: string, value: any) => {
    const buttons = [...(nodeData.buttons || [])];
    buttons[index] = { ...buttons[index], [key]: value };
    handleUpdate('buttons', buttons);
  };

  const removeButton = (index: number) => {
    const buttons = [...(nodeData.buttons || [])];
    buttons.splice(index, 1);
    handleUpdate('buttons', buttons);
  };

  const addListItem = () => {
    const items = nodeData.listItems || [];
    handleUpdate('listItems', [...items, { id: Date.now().toString(), title: '', description: '' }]);
  };

  const updateListItem = (index: number, key: string, value: any) => {
    const items = [...(nodeData.listItems || [])];
    items[index] = { ...items[index], [key]: value };
    handleUpdate('listItems', items);
  };

  const removeListItem = (index: number) => {
    const items = [...(nodeData.listItems || [])];
    items.splice(index, 1);
    handleUpdate('listItems', items);
  };

  const nodeTypeLabel: Record<string, string> = {
    start: 'Início',
    message: 'Mensagem',
    menu: 'Menu de Opções',
    input: 'Aguardar Resposta',
    businessHours: 'Verificar Horário',
    condition: 'Condição',
    delay: 'Delay',
    code: 'Código',
    http: 'HTTP Request',
    smartForm: 'Smart Form',
    sendForm: 'Formulário',
    tag: 'Tag',
    aiAgent: 'Assistente IA',
    forward: 'Transferir',
    error: 'Erro'
  };

  const renderForwardEditor = () => {
    return (
      <div className="space-y-5">
        {/* Tipo de Transferência */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Transferir para</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={nodeData.transferType !== 'agent' ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => {
                handleUpdate('transferType', 'queue');
                handleUpdate('specificAgentId', '');
                handleUpdate('specificAgentName', '');
              }}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Fila</span>
            </Button>
            <Button
              type="button"
              variant={nodeData.transferType === 'agent' ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => {
                handleUpdate('transferType', 'agent');
                handleUpdate('departmentId', '');
                handleUpdate('departmentName', '');
              }}
            >
              <User className="h-5 w-5" />
              <span className="text-xs">Agente</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Seleção de Fila/Departamento */}
        {nodeData.transferType !== 'agent' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selecione a Fila</Label>
            {departments.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600">
                  Nenhuma fila cadastrada. Crie um departamento primeiro em Configurações.
                </p>
              </div>
            ) : (
              <Select 
                value={nodeData.departmentId || ''} 
                onValueChange={(v) => {
                  const dept = departments.find((d: any) => d.id === v);
                  handleUpdate('departmentId', v);
                  handleUpdate('departmentName', dept?.name || '');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha uma fila" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: dept.color || '#3B82F6' }}
                        />
                        <span>{dept.name}</span>
                        {dept.department_members?.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {dept.department_members.length} agente(s)
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {nodeData.departmentId && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Conversa entrará na fila "{nodeData.departmentName}" e ficará visível para os agentes do departamento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Seleção de Agente */}
        {nodeData.transferType === 'agent' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selecione o Agente</Label>
            {humanAgents.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600">
                  Nenhum agente cadastrado. Adicione atendentes primeiro.
                </p>
              </div>
            ) : (
              <Select 
                value={nodeData.specificAgentId || ''} 
                onValueChange={(v) => {
                  const agent = humanAgents.find((a: any) => a.id === v);
                  handleUpdate('specificAgentId', v);
                  handleUpdate('specificAgentName', agent?.name || '');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um agente" />
                </SelectTrigger>
                <SelectContent>
                  {humanAgents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${agent.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span>{agent.name}</span>
                        {agent.isOnline && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-emerald-500/10 text-emerald-600">
                            Online
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {nodeData.specificAgentId && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Conversa será atribuída diretamente para "{nodeData.specificAgentName}".
                </p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Mensagem de transferência */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem de transferência</Label>
          <Textarea
            value={nodeData.transferMessage || ''}
            onChange={(e) => handleUpdate('transferMessage', e.target.value)}
            placeholder="Você será transferido para um atendente..."
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Esta mensagem será enviada ao cliente antes da transferência.
          </p>
        </div>

        {/* Notificar agente */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div>
            <Label className="text-sm font-medium">Notificar agente</Label>
            <p className="text-xs text-muted-foreground">Alertar sobre nova conversa</p>
          </div>
          <Switch
            checked={nodeData.notifyAgent || false}
            onCheckedChange={(v) => handleUpdate('notifyAgent', v)}
          />
        </div>
      </div>
    );
  };

  const renderMessageEditor = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de mensagem</Label>
          <Select value={nodeData.messageType || 'text'} onValueChange={(v) => handleUpdate('messageType', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto simples</SelectItem>
              <SelectItem value="buttons">Menu de opções</SelectItem>
              <SelectItem value="list">Lista interativa</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="audio">Áudio</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {['text', 'buttons', 'list'].includes(nodeData.messageType || 'text') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Conteúdo</Label>
            <Textarea
              value={nodeData.content || ''}
              onChange={(e) => handleUpdate('content', e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: {'{{nome}}'}, {'{{telefone}}'}, {'{{mensagem}}'}
            </p>
          </div>
        )}

        {nodeData.messageType === 'buttons' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Opções do menu</Label>
              <Button size="sm" variant="outline" onClick={addButton} disabled={(nodeData.buttons?.length || 0) >= 10}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {(nodeData.buttons || []).map((btn: any, index: number) => (
                <div key={btn.id || index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <Input
                      value={btn.text || ''}
                      onChange={(e) => updateButton(index, 'text', e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                      className="flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeButton(index)} className="text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={btn.keywords || ''}
                    onChange={(e) => updateButton(index, 'keywords', e.target.value)}
                    placeholder="Palavras-chave: suporte, ajuda"
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {nodeData.messageType === 'list' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Título da lista</Label>
              <Input
                value={nodeData.listTitle || ''}
                onChange={(e) => handleUpdate('listTitle', e.target.value)}
                placeholder="Escolha uma opção"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Itens</Label>
              <Button size="sm" variant="outline" onClick={addListItem}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {(nodeData.listItems || []).map((item: any, index: number) => (
                <div key={item.id || index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <Input
                      value={item.title || ''}
                      onChange={(e) => updateListItem(index, 'title', e.target.value)}
                      placeholder="Título"
                      className="flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeListItem(index)} className="text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.description || ''}
                    onChange={(e) => updateListItem(index, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {['image', 'audio', 'document', 'video'].includes(nodeData.messageType) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">URL da mídia</Label>
            <Input
              value={nodeData.mediaUrl || ''}
              onChange={(e) => handleUpdate('mediaUrl', e.target.value)}
              placeholder="https://..."
            />
            {nodeData.messageType === 'image' && (
              <>
                <Label className="text-sm font-medium">Legenda</Label>
                <Input
                  value={nodeData.caption || ''}
                  onChange={(e) => handleUpdate('caption', e.target.value)}
                  placeholder="Legenda da imagem"
                />
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStartEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Nome do bloco</Label>
        <Input
          value={nodeData.label || ''}
          onChange={(e) => handleUpdate('label', e.target.value)}
          placeholder="Início do fluxo"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Gatilho</Label>
        <Select value={nodeData.trigger || 'first_message'} onValueChange={(v) => handleUpdate('trigger', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_message">Primeira mensagem</SelectItem>
            <SelectItem value="keyword">Palavra-chave específica</SelectItem>
            <SelectItem value="business_hours">Horário comercial</SelectItem>
            <SelectItem value="out_of_hours">Fora do horário</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {nodeData.trigger === 'keyword' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Palavra-chave</Label>
          <Input
            value={nodeData.keyword || ''}
            onChange={(e) => handleUpdate('keyword', e.target.value)}
            placeholder="Ex: oi, olá, menu, orçamento"
          />
          <p className="text-xs text-muted-foreground">
            Separe múltiplas palavras-chave com vírgula
          </p>
        </div>
      )}
      {nodeData.trigger === 'business_hours' && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-600">
            Este fluxo será ativado apenas durante o horário comercial configurado nas configurações.
          </p>
        </div>
      )}
      {nodeData.trigger === 'out_of_hours' && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-600">
            Este fluxo será ativado apenas fora do horário comercial.
          </p>
        </div>
      )}
    </div>
  );

  const renderConditionEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de condição</Label>
        <Select value={nodeData.conditionType || 'expression'} onValueChange={(v) => handleUpdate('conditionType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expression">Expressão</SelectItem>
            <SelectItem value="contains">Contém texto</SelectItem>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="businessHours">Horário comercial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {nodeData.conditionType !== 'businessHours' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {nodeData.conditionType === 'expression' ? 'Expressão' : 'Valor'}
          </Label>
          <Input
            value={nodeData.expression || ''}
            onChange={(e) => handleUpdate('expression', e.target.value)}
            placeholder={nodeData.conditionType === 'expression' ? "vars.nome === 'João'" : "texto a comparar"}
          />
        </div>
      )}
    </div>
  );

  const renderInputEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Nome da variável</Label>
        <Input
          value={nodeData.variableName || ''}
          onChange={(e) => handleUpdate('variableName', e.target.value)}
          placeholder="nome_cliente"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Validação</Label>
        <Select value={nodeData.validationType || 'any'} onValueChange={(v) => handleUpdate('validationType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Qualquer</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="phone">Telefone</SelectItem>
            <SelectItem value="cpf">CPF</SelectItem>
            <SelectItem value="number">Número</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Mensagem de erro</Label>
        <Textarea
          value={nodeData.errorMessage || ''}
          onChange={(e) => handleUpdate('errorMessage', e.target.value)}
          placeholder="Por favor, informe um valor válido."
          rows={2}
        />
      </div>
    </div>
  );

  const renderDelayEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tempo de espera (segundos)</Label>
        <Input
          type="number"
          min={1}
          max={300}
          value={nodeData.delay || 3}
          onChange={(e) => handleUpdate('delay', parseInt(e.target.value) || 3)}
        />
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div>
          <Label className="text-sm font-medium">Mostrar "digitando..."</Label>
          <p className="text-xs text-muted-foreground">Simula digitação</p>
        </div>
        <Switch
          checked={nodeData.showTyping !== false}
          onCheckedChange={(v) => handleUpdate('showTyping', v)}
        />
      </div>
    </div>
  );

  const renderTagEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Ação</Label>
        <Select value={nodeData.tagAction || 'add'} onValueChange={(v) => handleUpdate('tagAction', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Adicionar tag</SelectItem>
            <SelectItem value="remove">Remover tag</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Nome da tag</Label>
        <Input
          value={nodeData.tagName || ''}
          onChange={(e) => handleUpdate('tagName', e.target.value)}
          placeholder="cliente_vip"
        />
      </div>
    </div>
  );

  const renderAiAgentEditor = () => {
    const activeAgents = agents.filter((a: any) => a.status === 'active');
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Assistente IA</Label>
          <Select value={nodeData.agentId || ''} onValueChange={(v) => {
            const agent = activeAgents.find((a: any) => a.id === v);
            handleUpdate('agentId', v);
            handleUpdate('agentName', agent?.name || '');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um assistente" />
            </SelectTrigger>
            <SelectContent>
              {activeAgents.map((agent: any) => (
                <SelectItem key={agent.id} value={agent.id}>
                  🤖 {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Separator />

        {/* Seção: Continuar Fluxo (quando resolvido) */}
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">✓ Continuar Fluxo</p>
          <p className="text-xs text-green-600/80 dark:text-green-400/80">
            Quando o assistente resolver o problema do cliente, o atendimento é encerrado automaticamente.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem de encerramento</Label>
          <Textarea
            value={nodeData.closingMessage || ''}
            onChange={(e) => handleUpdate('closingMessage', e.target.value)}
            placeholder="Fico feliz em ter ajudado! Até a próxima 👋"
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Mensagem enviada quando a IA resolve o problema do cliente.
          </p>
        </div>

        <Separator />

        {/* Seção: Transferência */}
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">↗ Transferir</p>
          <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
            Quando o cliente pedir humano ou a IA não conseguir resolver.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Palavras-chave para transferir</Label>
          <Textarea
            value={nodeData.transferKeywords || ''}
            onChange={(e) => handleUpdate('transferKeywords', e.target.value)}
            placeholder="falar com humano, atendente, pessoa real, quero um atendente"
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Separe por vírgula. Se cliente digitar alguma, transfere imediatamente.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Departamento para transferência</Label>
          <Select value={nodeData.fallbackDepartmentId || ''} onValueChange={(v) => {
            const dept = departments.find((d: any) => d.id === v);
            handleUpdate('fallbackDepartmentId', v);
            handleUpdate('fallbackDepartmentName', dept?.name || '');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Departamento para transferir quando IA não resolver ou cliente pedir.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Máximo de tentativas da IA</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={nodeData.maxAttempts || 5}
            onChange={(e) => handleUpdate('maxAttempts', parseInt(e.target.value) || 5)}
          />
          <p className="text-xs text-muted-foreground">
            Após este número de interações sem resolver, transfere para humano.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem antes de transferir</Label>
          <Textarea
            value={nodeData.transferMessage || ''}
            onChange={(e) => handleUpdate('transferMessage', e.target.value)}
            placeholder="Entendi! Vou te transferir para um atendente humano. Um momento..."
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
    );
  };

  const renderHttpEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Método</Label>
        <Select value={nodeData.httpMethod || 'GET'} onValueChange={(v) => handleUpdate('httpMethod', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">URL</Label>
        <Input
          value={nodeData.httpUrl || ''}
          onChange={(e) => handleUpdate('httpUrl', e.target.value)}
          placeholder="https://api.exemplo.com/endpoint"
        />
      </div>
      {['POST', 'PUT'].includes(nodeData.httpMethod) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Body (JSON)</Label>
          <Textarea
            value={nodeData.httpBody || ''}
            onChange={(e) => handleUpdate('httpBody', e.target.value)}
            placeholder='{"key": "value"}'
            rows={4}
            className="font-mono text-xs"
          />
        </div>
      )}
    </div>
  );

  const renderCodeEditor = () => (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
        <p className="font-medium">Variáveis disponíveis:</p>
        <p><code className="text-primary">message</code> - Texto recebido</p>
        <p><code className="text-primary">contact</code> - Dados do contato</p>
        <p><code className="text-primary">vars</code> - Variáveis do fluxo</p>
      </div>
      <div className="h-[250px] border rounded-md overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={nodeData.code || `// Retorne: { vars: {}, next: null }
return { vars: {}, next: null };`}
          onChange={(value) => handleUpdate('code', value)}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
          }}
        />
      </div>
    </div>
  );

  const renderSmartFormEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Smart Form</Label>
        <Select 
          value={nodeData.formId || ''} 
          onValueChange={(v) => {
            const form = forms.find(f => f.id === v);
            handleUpdate('formId', v);
            handleUpdate('formName', form?.name || '');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Escolha um formulário" />
          </SelectTrigger>
          <SelectContent>
            {forms.map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div>
          <Label className="text-sm font-medium">Verificar horário comercial</Label>
          <p className="text-xs text-muted-foreground">Só envia fora do expediente</p>
        </div>
        <Switch
          checked={nodeData.checkBusinessHours !== false}
          onCheckedChange={(v) => handleUpdate('checkBusinessHours', v)}
        />
      </div>
    </div>
  );

  const renderMenuEditor = () => {
    const addMenuOption = () => {
      const options = nodeData.menuOptions || [];
      handleUpdate('menuOptions', [...options, { id: Date.now().toString(), text: '', value: '', keywords: '' }]);
    };

    const updateMenuOption = (index: number, key: string, value: any) => {
      const options = [...(nodeData.menuOptions || [])];
      options[index] = { ...options[index], [key]: value };
      handleUpdate('menuOptions', options);
    };

    const removeMenuOption = (index: number) => {
      const options = [...(nodeData.menuOptions || [])];
      options.splice(index, 1);
      handleUpdate('menuOptions', options);
    };

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem do menu</Label>
          <Textarea
            value={nodeData.menuMessage || ''}
            onChange={(e) => handleUpdate('menuMessage', e.target.value)}
            placeholder="Escolha uma opção abaixo:"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Opções do menu</Label>
            <Button size="sm" variant="outline" onClick={addMenuOption} disabled={(nodeData.menuOptions?.length || 0) >= 10}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {(nodeData.menuOptions || []).map((opt: any, index: number) => (
              <div key={opt.id || index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <Input
                    value={opt.text || ''}
                    onChange={(e) => updateMenuOption(index, 'text', e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeMenuOption(index)} className="text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={opt.keywords || ''}
                  onChange={(e) => updateMenuOption(index, 'keywords', e.target.value)}
                  placeholder="Palavras-chave: suporte, ajuda"
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Regras de Erro integradas no Menu */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Regras de Erro</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
            Configuração para quando o cliente não digitar uma opção válida.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem de opção inválida</Label>
          <Textarea
            value={nodeData.invalidOptionMessage || ''}
            onChange={(e) => handleUpdate('invalidOptionMessage', e.target.value)}
            placeholder="Opção inválida. Por favor, escolha uma das opções acima."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Máximo de erros permitidos</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={nodeData.maxErrors || 3}
            onChange={(e) => handleUpdate('maxErrors', parseInt(e.target.value) || 3)}
          />
          <p className="text-xs text-muted-foreground">
            Após atingir este número, segue pela saída de "Erro".
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Ação após erros</Label>
          <Select value={nodeData.errorAction || 'continue'} onValueChange={(v) => handleUpdate('errorAction', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="continue">Seguir pela saída de erro</SelectItem>
              <SelectItem value="transfer">Transferir para atendente</SelectItem>
              <SelectItem value="message">Enviar mensagem e encerrar</SelectItem>
              <SelectItem value="restart">Reiniciar fluxo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {nodeData.errorAction === 'transfer' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Departamento</Label>
            <Select 
              value={nodeData.errorDepartmentId || ''} 
              onValueChange={(v) => {
                const dept = departments.find((d: any) => d.id === v);
                handleUpdate('errorDepartmentId', v);
                handleUpdate('errorDepartmentName', dept?.name || '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {nodeData.errorAction === 'message' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mensagem final</Label>
            <Textarea
              value={nodeData.errorFinalMessage || ''}
              onChange={(e) => handleUpdate('errorFinalMessage', e.target.value)}
              placeholder="Desculpe, não conseguimos continuar. Tente novamente mais tarde."
              rows={2}
              className="resize-none"
            />
          </div>
        )}
      </div>
    );
  };

  const renderBusinessHoursEditor = () => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Este bloco verifica se está dentro do horário comercial e redireciona o fluxo conforme configurado.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Horário comercial</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Início</Label>
              <Input
                type="time"
                value={nodeData.businessStart || '08:00'}
                onChange={(e) => handleUpdate('businessStart', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fim</Label>
              <Input
                type="time"
                value={nodeData.businessEnd || '18:00'}
                onChange={(e) => handleUpdate('businessEnd', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Dias de funcionamento</Label>
          <div className="flex flex-wrap gap-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => {
              const days = nodeData.businessDays || [1, 2, 3, 4, 5];
              const dayValue = index + 1;
              const isActive = days.includes(dayValue);
              return (
                <Button
                  key={day}
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className="h-8 w-10 p-0"
                  onClick={() => {
                    const newDays = isActive
                      ? days.filter((d: number) => d !== dayValue)
                      : [...days, dayValue].sort();
                    handleUpdate('businessDays', newDays);
                  }}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem fora do horário</Label>
          <Textarea
            value={nodeData.outsideHoursMessage || ''}
            onChange={(e) => handleUpdate('outsideHoursMessage', e.target.value)}
            placeholder="Nosso horário de atendimento é de segunda a sexta, das 08h às 18h."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
    );
  };

  const renderErrorHandlerEditor = () => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Configure regras para tratar erros consecutivos do usuário (opções inválidas, timeouts, etc.)
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Máximo de erros permitidos</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={nodeData.maxErrors || 3}
            onChange={(e) => handleUpdate('maxErrors', parseInt(e.target.value) || 3)}
          />
          <p className="text-xs text-muted-foreground">
            Após atingir este número, executa a ação configurada.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">Ação após erros</Label>
          <Select value={nodeData.errorAction || 'transfer'} onValueChange={(v) => handleUpdate('errorAction', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transfer">Transferir para atendente</SelectItem>
              <SelectItem value="message">Enviar mensagem e encerrar</SelectItem>
              <SelectItem value="restart">Reiniciar fluxo</SelectItem>
              <SelectItem value="continue">Continuar no fluxo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {nodeData.errorAction === 'transfer' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Departamento</Label>
            <Select 
              value={nodeData.errorDepartmentId || ''} 
              onValueChange={(v) => {
                const dept = departments.find((d: any) => d.id === v);
                handleUpdate('errorDepartmentId', v);
                handleUpdate('errorDepartmentName', dept?.name || '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {nodeData.errorAction === 'message' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mensagem final</Label>
            <Textarea
              value={nodeData.errorFinalMessage || ''}
              onChange={(e) => handleUpdate('errorFinalMessage', e.target.value)}
              placeholder="Desculpe, não conseguimos continuar. Tente novamente mais tarde."
              rows={3}
              className="resize-none"
            />
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem a cada erro</Label>
          <Textarea
            value={nodeData.errorRetryMessage || ''}
            onChange={(e) => handleUpdate('errorRetryMessage', e.target.value)}
            placeholder="Não entendi. Por favor, tente novamente."
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
    );
  };

  const renderEditor = () => {
    switch (node.type) {
      case 'start': return renderStartEditor();
      case 'message': return renderMessageEditor();
      case 'menu': return renderMenuEditor();
      case 'forward': return renderForwardEditor();
      case 'businessHours': return renderBusinessHoursEditor();
      case 'condition': return renderConditionEditor();
      case 'input': return renderInputEditor();
      case 'delay': return renderDelayEditor();
      case 'tag': return renderTagEditor();
      case 'aiAgent': return renderAiAgentEditor();
      case 'http': return renderHttpEditor();
      case 'code': return renderCodeEditor();
      case 'smartForm': return renderSmartFormEditor();
      default:
        return <p className="text-muted-foreground text-sm">Configuração não disponível para este bloco.</p>;
    }
  };

  return (
    <Card className="w-[340px] h-full flex flex-col border-l rounded-none bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div>
          <h3 className="font-semibold text-sm">Editar Bloco</h3>
          <p className="text-xs text-muted-foreground">{nodeTypeLabel[node.type || ''] || node.type}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {renderEditor()}
        </div>
      </ScrollArea>
    </Card>
  );
};
