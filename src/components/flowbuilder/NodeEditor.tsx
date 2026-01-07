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
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useDepartments } from '@/hooks/useDepartments';
import { useSmartForms } from '@/hooks/useSmartForms';
import { useAgents } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export const NodeEditor = ({ node, onUpdate, onClose }: NodeEditorProps) => {
  const [nodeData, setNodeData] = useState<any>({});
  const { departments } = useDepartments();
  const { forms } = useSmartForms();
  const { agents } = useAgents();
  
  // Buscar atendentes humanos (role 'agent')
  const { data: humanAgents = [] } = useQuery({
    queryKey: ['human-agents-for-flow'],
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

  const addFormField = () => {
    const fields = nodeData.fields || [];
    handleUpdate('fields', [...fields, { name: '', type: 'text', label: '', required: false }]);
  };

  const updateFormField = (index: number, key: string, value: any) => {
    const fields = [...(nodeData.fields || [])];
    fields[index] = { ...fields[index], [key]: value };
    handleUpdate('fields', fields);
  };

  const removeFormField = (index: number) => {
    const fields = [...(nodeData.fields || [])];
    fields.splice(index, 1);
    handleUpdate('fields', fields);
  };

  // HTTP Headers helpers
  const addHttpHeader = () => {
    const headers = nodeData.httpHeaders || [];
    handleUpdate('httpHeaders', [...headers, { key: '', value: '' }]);
  };

  const updateHttpHeader = (index: number, field: 'key' | 'value', value: string) => {
    const headers = [...(nodeData.httpHeaders || [])];
    headers[index] = { ...headers[index], [field]: value };
    handleUpdate('httpHeaders', headers);
  };

  const removeHttpHeader = (index: number) => {
    const headers = [...(nodeData.httpHeaders || [])];
    headers.splice(index, 1);
    handleUpdate('httpHeaders', headers);
  };

  const renderEditor = () => {
    switch (node.type) {
      case 'start':
        return (
          <div className="space-y-4">
            <div>
              <Label>Nome do bloco</Label>
              <Input
                value={nodeData.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
                placeholder="Início do fluxo"
              />
            </div>
            <div>
              <Label>Gatilho</Label>
              <Select value={nodeData.trigger || 'message'} onValueChange={(v) => handleUpdate('trigger', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Mensagem recebida</SelectItem>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="new_contact">Novo contato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nodeData.trigger === 'keyword' && (
              <div>
                <Label>Palavra-chave</Label>
                <Input
                  value={nodeData.keyword || ''}
                  onChange={(e) => handleUpdate('keyword', e.target.value)}
                  placeholder="Ex: oi, olá, menu"
                />
              </div>
            )}
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de mensagem</Label>
              <Select value={nodeData.messageType || 'text'} onValueChange={(v) => handleUpdate('messageType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto simples</SelectItem>
                  <SelectItem value="buttons">Menu de opções (texto)</SelectItem>
                  <SelectItem value="list">Lista interativa</SelectItem>
                  <SelectItem value="image">Imagem com legenda</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {nodeData.messageType === 'buttons' && "Opções enviadas como texto formatado com números"}
                {nodeData.messageType === 'list' && "Lista interativa do WhatsApp"}
              </p>
            </div>
            
            {/* Text content for text, buttons, and list */}
            {['text', 'buttons', 'list'].includes(nodeData.messageType || 'text') && (
              <div>
                <Label>Conteúdo da mensagem</Label>
                <Textarea
                  value={nodeData.content || ''}
                  onChange={(e) => handleUpdate('content', e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{nome}}'} para nome, {'{{telefone}}'} para telefone, {'{{mensagem}}'} para mensagem recebida
                </p>
              </div>
            )}

            {nodeData.messageType === 'buttons' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Opções do menu (máx 10)</Label>
                    <Button size="sm" variant="outline" onClick={addButton} disabled={(nodeData.buttons?.length || 0) >= 10}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(nodeData.buttons || []).map((btn: any, index: number) => (
                      <div key={btn.id || index} className="p-3 border rounded-lg bg-background shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                            {index + 1}
                          </span>
                          <Input
                            value={btn.text || ''}
                            onChange={(e) => updateButton(index, 'text', e.target.value)}
                            placeholder={`Opção ${index + 1}`}
                            className="flex-1 bg-background text-foreground"
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeButton(index)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Variações (palavras-chave alternativas)</Label>
                          <Input
                            value={btn.keywords || ''}
                            onChange={(e) => updateButton(index, 'keywords', e.target.value)}
                            placeholder="suporte, ajuda, help"
                            className="mt-1 text-xs bg-background text-foreground"
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Separe com vírgula. Ex: suporte, ajuda, help
                          </p>
                        </div>
                      </div>
                    ))}
                    {(nodeData.buttons?.length || 0) === 0 && (
                      <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">Clique em "Adicionar" para criar opções do menu</p>
                    )}
                  </div>
                </div>
                
                {/* Message Preview */}
                {(nodeData.buttons?.length || 0) > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium mb-2 block">Preview da mensagem</Label>
                    <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap shadow-sm">
                      {nodeData.content || 'Escolha uma opção:'}{'\n\n'}
                      {(nodeData.buttons || []).map((btn: any, idx: number) => {
                        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
                        return `${emojis[idx] || `${idx + 1}.`} ${btn.text || `Opção ${idx + 1}`}`;
                      }).join('\n')}{'\n\n'}
                      <span className="italic text-gray-600">_Responda com o número da opção desejada._</span>
                    </div>
                  </div>
                )}
                
                {/* Error handling section */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium">Tratamento de erro</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Quando o usuário digitar algo que não corresponde a nenhuma opção
                  </p>
                  <Textarea
                    value={nodeData.errorMessage || ''}
                    onChange={(e) => handleUpdate('errorMessage', e.target.value)}
                    placeholder="Não entendi sua resposta. Por favor, digite apenas o número da opção desejada."
                    rows={2}
                    className="bg-background text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Deixe vazio para ignorar respostas inválidas. Preencha para criar uma saída de erro no bloco.
                  </p>
                  
                  {nodeData.errorMessage && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">Máximo de erros antes de usar saída de erro</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={nodeData.maxErrors || 3}
                        onChange={(e) => handleUpdate('maxErrors', parseInt(e.target.value) || 3)}
                        placeholder="3"
                        className="mt-1"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Após X erros consecutivos, segue pela saída de erro (vermelho)
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {nodeData.messageType === 'list' && (
              <>
                <div>
                  <Label>Título da lista</Label>
                  <Input
                    value={nodeData.listTitle || ''}
                    onChange={(e) => handleUpdate('listTitle', e.target.value)}
                    placeholder="Escolha uma opção"
                  />
                </div>
                <div>
                  <Label>Texto do botão</Label>
                  <Input
                    value={nodeData.listButtonText || ''}
                    onChange={(e) => handleUpdate('listButtonText', e.target.value)}
                    placeholder="Ver opções"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Itens da lista</Label>
                    <Button size="sm" variant="outline" onClick={addListItem}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(nodeData.listItems || []).map((item: any, index: number) => (
                      <div key={item.id || index} className="p-3 border rounded-lg bg-background shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                            {index + 1}
                          </span>
                          <Input
                            value={item.title || ''}
                            onChange={(e) => updateListItem(index, 'title', e.target.value)}
                            placeholder="Título da opção"
                            className="flex-1 bg-background text-foreground"
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeListItem(index)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateListItem(index, 'description', e.target.value)}
                          placeholder="Descrição (opcional)"
                          className="bg-background text-foreground"
                        />
                        <div>
                          <Label className="text-xs text-muted-foreground">Variações (palavras-chave alternativas)</Label>
                          <Input
                            value={item.keywords || ''}
                            onChange={(e) => updateListItem(index, 'keywords', e.target.value)}
                            placeholder="suporte, ajuda, help"
                            className="mt-1 text-xs bg-background text-foreground"
                          />
                        </div>
                      </div>
                    ))}
                    {(nodeData.listItems?.length || 0) === 0 && (
                      <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">Clique em "Adicionar" para criar itens da lista</p>
                    )}
                  </div>
                </div>
                
                {/* Error handling section */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium">Tratamento de erro</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Quando o usuário digitar algo que não corresponde a nenhuma opção
                  </p>
                  <Textarea
                    value={nodeData.errorMessage || ''}
                    onChange={(e) => handleUpdate('errorMessage', e.target.value)}
                    placeholder="Não entendi sua resposta. Por favor, escolha uma das opções acima."
                    rows={2}
                    className="bg-background text-foreground"
                  />
                </div>
              </>
            )}

            {/* Media types */}
            {['image', 'audio', 'document', 'video'].includes(nodeData.messageType) && (
              <>
                <div>
                  <Label>URL do arquivo</Label>
                  <Input
                    value={nodeData.mediaUrl || ''}
                    onChange={(e) => handleUpdate('mediaUrl', e.target.value)}
                    placeholder="https://exemplo.com/arquivo.jpg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cole a URL pública do arquivo
                  </p>
                </div>
                {['image', 'video'].includes(nodeData.messageType) && (
                  <div>
                    <Label>Legenda/Texto (opcional)</Label>
                    <Textarea
                      value={nodeData.caption || ''}
                      onChange={(e) => handleUpdate('caption', e.target.value)}
                      placeholder="Texto que aparece junto com a mídia..."
                      rows={3}
                    />
                  </div>
                )}
                {nodeData.messageType === 'document' && (
                  <div>
                    <Label>Nome do arquivo</Label>
                    <Input
                      value={nodeData.fileName || ''}
                      onChange={(e) => handleUpdate('fileName', e.target.value)}
                      placeholder="documento.pdf"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <Label>Mensagem de prompt</Label>
              <Textarea
                value={nodeData.promptMessage || ''}
                onChange={(e) => handleUpdate('promptMessage', e.target.value)}
                placeholder="Qual é o seu nome?"
                rows={2}
              />
            </div>
            <div>
              <Label>Salvar resposta em</Label>
              <Input
                value={nodeData.variableName || ''}
                onChange={(e) => handleUpdate('variableName', e.target.value)}
                placeholder="nome_usuario"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A resposta será salva em {'{{variableName}}'}
              </p>
            </div>
            <div>
              <Label>Tipo de validação</Label>
              <Select value={nodeData.validationType || 'any'} onValueChange={(v) => handleUpdate('validationType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer texto</SelectItem>
                  <SelectItem value="number">Apenas números</SelectItem>
                  <SelectItem value="email">Email válido</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem de erro</Label>
              <Input
                value={nodeData.errorMessage || ''}
                onChange={(e) => handleUpdate('errorMessage', e.target.value)}
                placeholder="Por favor, digite um valor válido"
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de condição</Label>
              <Select value={nodeData.conditionType || 'expression'} onValueChange={(v) => handleUpdate('conditionType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expression">Expressão JavaScript</SelectItem>
                  <SelectItem value="contains">Mensagem contém</SelectItem>
                  <SelectItem value="equals">Mensagem igual a</SelectItem>
                  <SelectItem value="variable">Verificar variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {nodeData.conditionType === 'expression' && (
              <div>
                <Label>Expressão (JavaScript)</Label>
                <Textarea
                  value={nodeData.condition || ''}
                  onChange={(e) => handleUpdate('condition', e.target.value)}
                  placeholder="vars.idade > 18"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis: vars, message, contact
                </p>
              </div>
            )}

            {nodeData.conditionType === 'contains' && (
              <div>
                <Label>Texto a procurar</Label>
                <Input
                  value={nodeData.searchText || ''}
                  onChange={(e) => handleUpdate('searchText', e.target.value)}
                  placeholder="sim, confirmar, ok"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separe múltiplos valores com vírgula
                </p>
              </div>
            )}

            {nodeData.conditionType === 'equals' && (
              <div>
                <Label>Valor esperado</Label>
                <Input
                  value={nodeData.expectedValue || ''}
                  onChange={(e) => handleUpdate('expectedValue', e.target.value)}
                  placeholder="1"
                />
              </div>
            )}

            {nodeData.conditionType === 'variable' && (
              <>
                <div>
                  <Label>Nome da variável</Label>
                  <Input
                    value={nodeData.variableName || ''}
                    onChange={(e) => handleUpdate('variableName', e.target.value)}
                    placeholder="idade"
                  />
                </div>
                <div>
                  <Label>Operador</Label>
                  <Select value={nodeData.operator || 'equals'} onValueChange={(v) => handleUpdate('operator', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Igual a</SelectItem>
                      <SelectItem value="not_equals">Diferente de</SelectItem>
                      <SelectItem value="greater">Maior que</SelectItem>
                      <SelectItem value="less">Menor que</SelectItem>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="exists">Existe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    value={nodeData.compareValue || ''}
                    onChange={(e) => handleUpdate('compareValue', e.target.value)}
                    placeholder="18"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tempo de espera</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={nodeData.delay || ''}
                  onChange={(e) => handleUpdate('delay', e.target.value)}
                  placeholder="5"
                  className="w-24"
                />
                <Select value={nodeData.delayUnit || 'seconds'} onValueChange={(v) => handleUpdate('delayUnit', v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Segundos</SelectItem>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={nodeData.showTyping || false}
                onCheckedChange={(v) => handleUpdate('showTyping', v)}
              />
              <Label>Mostrar "digitando..." durante a espera</Label>
            </div>
          </div>
        );

      case 'http':
        return (
          <div className="space-y-4">
            <div>
              <Label>Nome do bloco</Label>
              <Input
                value={nodeData.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
                placeholder="Requisição HTTP"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label>Método</Label>
                <Select value={nodeData.method || 'GET'} onValueChange={(v) => handleUpdate('method', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Timeout (segundos)</Label>
                <Input
                  type="number"
                  value={nodeData.timeout || '30'}
                  onChange={(e) => handleUpdate('timeout', e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            
            <div>
              <Label>URL da API</Label>
              <Input
                value={nodeData.url || ''}
                onChange={(e) => handleUpdate('url', e.target.value)}
                placeholder="https://api.exemplo.com/endpoint"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{variavel}}'} para valores dinâmicos
              </p>
            </div>

            {/* Headers Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Headers</Label>
                <Button size="sm" variant="outline" onClick={addHttpHeader}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              
              {/* Common headers quick-add */}
              <div className="flex flex-wrap gap-1 mb-2">
                {[
                  { key: 'Content-Type', value: 'application/json' },
                  { key: 'Authorization', value: 'Bearer {{token}}' },
                  { key: 'Accept', value: 'application/json' },
                ].map((preset) => (
                  <Button
                    key={preset.key}
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const headers = nodeData.httpHeaders || [];
                      const exists = headers.some((h: any) => h.key === preset.key);
                      if (!exists) {
                        handleUpdate('httpHeaders', [...headers, preset]);
                      }
                    }}
                  >
                    + {preset.key}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-2">
                {(nodeData.httpHeaders || []).map((header: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={header.key || ''}
                      onChange={(e) => updateHttpHeader(index, 'key', e.target.value)}
                      placeholder="Header-Name"
                      className="flex-1"
                    />
                    <Input
                      value={header.value || ''}
                      onChange={(e) => updateHttpHeader(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeHttpHeader(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Section - only for POST, PUT, PATCH */}
            {['POST', 'PUT', 'PATCH'].includes(nodeData.method) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Body</Label>
                  <Select 
                    value={nodeData.bodyType || 'json'} 
                    onValueChange={(v) => handleUpdate('bodyType', v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="form">Form Data</SelectItem>
                      <SelectItem value="raw">Raw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="h-[150px] border rounded-md overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage={nodeData.bodyType === 'json' ? 'json' : 'plaintext'}
                    theme="vs-dark"
                    value={nodeData.body || (nodeData.bodyType === 'json' ? '{\n  "key": "{{variavel}}"\n}' : '')}
                    onChange={(value) => handleUpdate('body', value)}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'off',
                      folding: false,
                      wordWrap: 'on',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{variavel}}'} para inserir valores dinâmicos
                </p>
              </div>
            )}

            {/* Response handling */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-semibold">Tratamento da Resposta</Label>
              
              <div className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs">Salvar resposta completa em</Label>
                  <Input
                    value={nodeData.responseVariable || ''}
                    onChange={(e) => handleUpdate('responseVariable', e.target.value)}
                    placeholder="api_response"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Extrair campo específico (JSONPath)</Label>
                  <Input
                    value={nodeData.extractPath || ''}
                    onChange={(e) => handleUpdate('extractPath', e.target.value)}
                    placeholder="data.items[0].name"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: data.user.id, results[0].name
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={nodeData.continueOnError || false}
                    onCheckedChange={(v) => handleUpdate('continueOnError', v)}
                  />
                  <Label className="text-xs">Continuar fluxo mesmo se houver erro</Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tag':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ação</Label>
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
            <div>
              <Label>Nome da tag</Label>
              <Input
                value={nodeData.tagName || ''}
                onChange={(e) => handleUpdate('tagName', e.target.value)}
                placeholder="cliente_vip"
              />
            </div>
          </div>
        );

      case 'code':
        const codeExamples = [
          {
            name: '📅 Verificar horário comercial',
            code: `// Verifica se está no horário comercial
const dentroDoHorario = utils.isBusinessHours();

utils.log('Horário comercial: ' + dentroDoHorario);

return { 
  vars: { dentroDoHorario },
  next: null 
};`
          },
          {
            name: '📧 Validar e-mail',
            code: `// Valida o e-mail informado
const email = message.trim();
const emailValido = utils.isValidEmail(email);

utils.log('E-mail: ' + email + ' - Válido: ' + emailValido);

return { 
  vars: { 
    email,
    emailValido 
  },
  next: null 
};`
          },
          {
            name: '📱 Formatar telefone',
            code: `// Formata o telefone
const telefoneOriginal = message;
const telefoneFormatado = utils.formatPhone(telefoneOriginal);
const telefoneValido = utils.isValidPhone(telefoneOriginal);

return { 
  vars: { 
    telefoneOriginal,
    telefoneFormatado,
    telefoneValido 
  },
  next: null 
};`
          },
          {
            name: '🔢 Extrair números',
            code: `// Extrai apenas números da mensagem
const texto = message;
const numeros = utils.extractNumbers(texto);

utils.log('Números extraídos: ' + numeros);

return { 
  vars: { numeros },
  next: null 
};`
          },
          {
            name: '🎲 Número aleatório',
            code: `// Gera número aleatório para sorteio
const numeroSorteado = utils.random(1, 100);
const dataAtual = utils.formatDate(utils.now());

utils.log('Número sorteado: ' + numeroSorteado);

return { 
  vars: { 
    numeroSorteado,
    dataAtual 
  },
  next: null 
};`
          },
          {
            name: '👤 Processar nome',
            code: `// Processa e formata o nome
const nomeOriginal = message.trim();
const nomeFormatado = utils.capitalize(nomeOriginal);
const primeiroNome = nomeFormatado.split(' ')[0];

return { 
  vars: { 
    nomeCompleto: nomeFormatado,
    primeiroNome 
  },
  next: null 
};`
          },
          {
            name: '📄 Validar CPF',
            code: `// Valida CPF informado
const cpf = message;
const cpfValido = utils.isValidCPF(cpf);
const cpfNumeros = utils.extractNumbers(cpf);

utils.log('CPF: ' + cpfNumeros + ' - Válido: ' + cpfValido);

return { 
  vars: { 
    cpf: cpfNumeros,
    cpfValido 
  },
  next: null 
};`
          },
          {
            name: '🔀 Roteamento condicional',
            code: `// Roteia baseado em palavra-chave
const msg = message.toLowerCase();
let destino = null;

if (msg.includes('suporte') || msg.includes('ajuda')) {
  destino = 'node_suporte'; // ID do nó de suporte
} else if (msg.includes('vendas') || msg.includes('comprar')) {
  destino = 'node_vendas'; // ID do nó de vendas
}

return { 
  vars: { categoria: destino ? 'identificada' : 'nao_identificada' },
  next: destino 
};`
          },
        ];

        return (
          <div className="space-y-4">
            <div>
              <Label>Nome do bloco</Label>
              <Input
                value={nodeData.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
                placeholder="Processar dados"
              />
            </div>

            {/* Code Examples */}
            <div>
              <Label className="mb-2 block">Exemplos de código</Label>
              <div className="flex flex-wrap gap-1 mb-3">
                {codeExamples.map((example, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleUpdate('code', example.code)}
                  >
                    {example.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Variables Reference */}
            <div className="bg-muted p-3 rounded-lg text-xs space-y-2">
              <p className="font-medium text-sm">📦 Variáveis disponíveis:</p>
              <div className="grid grid-cols-2 gap-2">
                <div><code className="text-primary">message</code> - Mensagem do usuário</div>
                <div><code className="text-primary">contact.name</code> - Nome do contato</div>
                <div><code className="text-primary">contact.phone</code> - Telefone</div>
                <div><code className="text-primary">vars</code> - Variáveis do fluxo</div>
              </div>
              <p className="font-medium text-sm mt-3">🛠️ Funções utils:</p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div><code>utils.now()</code> - Data atual</div>
                <div><code>utils.formatDate(date)</code> - Formatar data</div>
                <div><code>utils.isBusinessHours()</code> - Horário comercial</div>
                <div><code>utils.capitalize(str)</code> - Capitalizar</div>
                <div><code>utils.extractNumbers(str)</code> - Só números</div>
                <div><code>utils.formatPhone(phone)</code> - Formatar tel</div>
                <div><code>utils.isValidEmail(email)</code> - Validar email</div>
                <div><code>utils.isValidCPF(cpf)</code> - Validar CPF</div>
                <div><code>utils.isValidPhone(phone)</code> - Validar tel</div>
                <div><code>utils.random(min, max)</code> - Número aleatório</div>
                <div><code>utils.log(msg)</code> - Log no console</div>
              </div>
            </div>

            <div>
              <Label>Código JavaScript</Label>
              <div className="h-[300px] border rounded-md overflow-hidden">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={nodeData.code || `// Variáveis: message, contact, vars, utils
// Retorne: { vars: {}, next: null }

// Exemplo: capturar nome
const nome = utils.capitalize(message);

utils.log('Nome capturado: ' + nome);

return { 
  vars: { nome },
  next: null 
};`}
                  onChange={(value) => handleUpdate('code', value)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'form':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              ⚠️ Este bloco foi substituído pelo <strong>Smart Form</strong>. 
              Use o novo bloco para enviar links de formulário.
            </p>
          </div>
        );

      case 'smartForm':
        return (
          <div className="space-y-4">
            <div>
              <Label>Selecione o Smart Form *</Label>
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
                      {form.name} ({form.fields.length} campos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {forms.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhum formulário criado. Acesse Smart Forms para criar.
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <Switch
                checked={nodeData.checkBusinessHours !== false}
                onCheckedChange={(v) => handleUpdate('checkBusinessHours', v)}
              />
              <div>
                <Label className="text-sm text-yellow-400">Verificar horário comercial</Label>
                <p className="text-xs text-muted-foreground">Só envia formulário fora do expediente</p>
              </div>
            </div>

            <div>
              <Label>Mensagem antes do link (opcional)</Label>
              <Textarea
                value={nodeData.messageBeforeLink || ''}
                onChange={(e) => handleUpdate('messageBeforeLink', e.target.value)}
                placeholder="Deixe em branco para usar a mensagem de boas-vindas do formulário"
                rows={3}
              />
            </div>

            <div>
              <Label>Mensagem após preenchimento (opcional)</Label>
              <Textarea
                value={nodeData.successMessage || ''}
                onChange={(e) => handleUpdate('successMessage', e.target.value)}
                placeholder="Deixe em branco para usar a mensagem de sucesso do formulário"
                rows={2}
              />
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Gerencie formulários em <strong>Smart Forms</strong> no menu lateral
              </p>
            </div>
          </div>
        );

      case 'sendForm':
        return (
          <div className="space-y-4">
            <div>
              <Label>Mensagem inicial</Label>
              <Textarea
                value={nodeData.initialMessage || ''}
                onChange={(e) => handleUpdate('initialMessage', e.target.value)}
                placeholder="Para agilizar seu atendimento, preencha o formulário abaixo:"
                rows={2}
              />
            </div>
            
            <div>
              <Label>Tempo de expiração (horas)</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={nodeData.expiresInHours || 24}
                onChange={(e) => handleUpdate('expiresInHours', parseInt(e.target.value) || 24)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Perguntas do formulário</Label>
                <Button size="sm" variant="outline" onClick={() => {
                  const questions = nodeData.questions || [];
                  handleUpdate('questions', [...questions, { 
                    id: Date.now().toString(), 
                    label: '', 
                    type: 'text',
                    required: false 
                  }]);
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {(nodeData.questions || []).map((q: any, index: number) => (
                  <div key={q.id || index} className="p-3 border rounded-lg bg-background shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <Input
                        value={q.label || ''}
                        onChange={(e) => {
                          const questions = [...(nodeData.questions || [])];
                          questions[index] = { ...questions[index], label: e.target.value };
                          handleUpdate('questions', questions);
                        }}
                        placeholder={`Pergunta ${index + 1}`}
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost" onClick={() => {
                        const questions = [...(nodeData.questions || [])];
                        questions.splice(index, 1);
                        handleUpdate('questions', questions);
                      }} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={q.type || 'text'} 
                        onValueChange={(v) => {
                          const questions = [...(nodeData.questions || [])];
                          questions[index] = { ...questions[index], type: v };
                          handleUpdate('questions', questions);
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="textarea">Texto longo</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={q.required || false}
                          onCheckedChange={(v) => {
                            const questions = [...(nodeData.questions || [])];
                            questions[index] = { ...questions[index], required: v };
                            handleUpdate('questions', questions);
                          }}
                        />
                        <Label className="text-xs">Obrigatório</Label>
                      </div>
                    </div>
                  </div>
                ))}
                {(nodeData.questions?.length || 0) === 0 && (
                  <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                    Clique em "Adicionar" para criar perguntas
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                📋 O formulário inclui automaticamente: <strong>Nome</strong>, <strong>Telefone</strong> e <strong>Endereço</strong>
              </p>
            </div>
          </div>
        );

      case 'forward':
        return (
          <div className="space-y-4">
            {/* Tipo de transferência - dropdown */}
            <div>
              <Label className="mb-2 block">Transferir para</Label>
              <Select 
                value={nodeData.transferType || 'queue'} 
                onValueChange={(v) => {
                  handleUpdate('transferType', v);
                  if (v === 'queue') {
                    handleUpdate('specificAgentId', '');
                    handleUpdate('specificAgentName', '');
                  } else {
                    handleUpdate('departmentId', '');
                    handleUpdate('departmentName', '');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o tipo de transferência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">Fila (Departamento)</SelectItem>
                  <SelectItem value="agent">Agente Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Departamento - quando transferir para fila */}
            {(nodeData.transferType === 'queue' || !nodeData.transferType) && (
              <div>
                <Label className="mb-2 block">Selecione a Fila (Departamento)</Label>
                {departments.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    Nenhum departamento cadastrado. Crie um departamento primeiro.
                  </p>
                ) : (
                  <Select 
                    value={nodeData.departmentId || ''} 
                    onValueChange={(v) => {
                      const dept = departments.find((d: any) => d.id === v);
                      handleUpdate('departmentId', v);
                      handleUpdate('departmentName', dept?.name || '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: dept.color || '#3B82F6' }}
                            />
                            {dept.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  A conversa irá para a fila do departamento. Agentes vinculados a este departamento verão a conversa na aba "Fila".
                </p>
              </div>
            )}

            {/* Agente específico */}
            {nodeData.transferType === 'agent' && (
              <div>
                <Label className="mb-2 block">Selecione o Atendente</Label>
                {humanAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    Nenhum atendente cadastrado. Adicione agentes primeiro.
                  </p>
                ) : (
                  <Select 
                    value={nodeData.specificAgentId || ''} 
                    onValueChange={(v) => {
                      const agent = humanAgents.find((a: any) => a.id === v);
                      handleUpdate('specificAgentId', v);
                      handleUpdate('specificAgentName', agent?.name || '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {humanAgents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {agent.name}
                            {agent.isOnline && <span className="text-xs text-green-600 ml-2">(Online)</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  A conversa irá diretamente para o chat do atendente selecionado.
                </p>
              </div>
            )}

            {/* Filtro de agentes (opcional) */}
            <div>
              <Label className="mb-2 block">Filtro de agentes (opcional)</Label>
              <Input
                value={nodeData.agentFilter || ''}
                onChange={(e) => handleUpdate('agentFilter', e.target.value)}
                placeholder="IDs de agentes separados por vírgula"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Você pode informar aqui quais filtros serão aplicados ao atendimento para distribuição. Você também pode utilizar IDs de agentes como filtros.
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Mensagem de transferência</Label>
              <Textarea
                value={nodeData.transferMessage || ''}
                onChange={(e) => handleUpdate('transferMessage', e.target.value)}
                placeholder="Você será transferido para um atendente..."
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={nodeData.notifyAgent || false}
                onCheckedChange={(v) => handleUpdate('notifyAgent', v)}
              />
              <Label>Notificar agente sobre transferência</Label>
            </div>
          </div>
        );

      case 'aiAgent':
        const activeAgents = agents.filter((a: any) => a.status === 'active');
        return (
          <div className="space-y-4">
            <div>
              <Label>Assistente IA *</Label>
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
              {activeAgents.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Nenhum assistente ativo. Crie um em Assistentes IA.
                </p>
              )}
            </div>
            <div>
              <Label>Rótulo do bloco</Label>
              <Input
                value={nodeData.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
                placeholder="Assistente IA"
              />
            </div>
            
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-medium">Fallback - Transferência automática</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Quando a IA não conseguir atender, transfere automaticamente
              </p>
              <Select value={nodeData.fallbackDepartmentId || 'none'} onValueChange={(v) => {
                const actualValue = v === 'none' ? '' : v;
                const dept = departments.find(d => d.id === actualValue);
                handleUpdate('fallbackDepartmentId', actualValue);
                handleUpdate('fallbackDepartmentName', dept?.name || '');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (continuar no fluxo)</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Máximo de erros antes de transferir</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={nodeData.maxErrors || 3}
                onChange={(e) => handleUpdate('maxErrors', parseInt(e.target.value) || 3)}
                placeholder="3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Após X respostas sem solução, transfere para humano
              </p>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                🤖 O assistente IA responderá automaticamente usando inteligência artificial. Se configurado, pode transferir para humano quando necessário.
              </p>
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">Bloco não suporta edição.</p>;
    }
  };

  return (
    <Card className="w-80 h-full p-4 border-l rounded-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Editar Bloco</h3>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="pr-4">
          {renderEditor()}
        </div>
      </ScrollArea>
    </Card>
  );
};
