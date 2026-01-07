import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, User, Bot, Play, RotateCcw, Smartphone, Terminal, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Info, Users, ArrowRight } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { executeFlow, ExecutionLog } from '@/lib/flow-engine';
import { cn } from '@/lib/utils';

interface FlowTesterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node[];
  edges: Edge[];
  flowStatus?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  isLink?: boolean;
}

interface FlowDiagnostic {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  nodeId?: string;
}

export const FlowTester = ({ open, onOpenChange, nodes, edges, flowStatus }: FlowTesterProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [context, setContext] = useState<Record<string, any>>({});
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<FlowDiagnostic[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Run diagnostics when dialog opens
  useEffect(() => {
    if (open) {
      runDiagnostics();
    }
  }, [open, nodes, edges]);

  const runDiagnostics = () => {
    const newDiagnostics: FlowDiagnostic[] = [];
    
    // Check if flow is published (CRITICAL)
    if (flowStatus === 'inactive' || flowStatus === 'draft') {
      newDiagnostics.push({
        type: 'error',
        title: '⚠️ Fluxo NÃO PUBLICADO',
        description: 'O fluxo está inativo. Clique em "Publicar" para que funcione em produção!'
      });
    } else if (flowStatus === 'active') {
      newDiagnostics.push({
        type: 'success',
        title: 'Fluxo PUBLICADO',
        description: 'O fluxo está ativo e funcionando em produção.'
      });
    }
    
    // Check for start node
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
      newDiagnostics.push({
        type: 'error',
        title: 'Bloco de Início ausente',
        description: 'O fluxo precisa ter um bloco de "Início" para funcionar.'
      });
    } else {
      newDiagnostics.push({
        type: 'success',
        title: 'Bloco de Início configurado',
        description: 'O fluxo tem um ponto de entrada válido.'
      });
    }

    // Check for orphan nodes (no incoming edges except start)
    const nodesWithIncoming = new Set(edges.map(e => e.target));
    const orphanNodes = nodes.filter(n => n.type !== 'start' && !nodesWithIncoming.has(n.id));
    if (orphanNodes.length > 0) {
      newDiagnostics.push({
        type: 'warning',
        title: `${orphanNodes.length} bloco(s) sem conexão de entrada`,
        description: `Blocos sem conexão não serão executados: ${orphanNodes.map(n => n.data?.label || n.type).join(', ')}`,
        nodeId: orphanNodes[0]?.id
      });
    }

    // Check for nodes without outgoing edges (dead ends that aren't forward/close)
    const nodesWithOutgoing = new Set(edges.map(e => e.source));
    const terminalTypes = ['forward', 'close'];
    const deadEndNodes = nodes.filter(n => 
      !nodesWithOutgoing.has(n.id) && 
      !terminalTypes.includes(n.type || '') &&
      n.type !== 'start'
    );
    if (deadEndNodes.length > 0) {
      newDiagnostics.push({
        type: 'warning',
        title: `${deadEndNodes.length} bloco(s) sem saída`,
        description: `O fluxo pode terminar abruptamente em: ${deadEndNodes.map(n => n.data?.label || n.type).join(', ')}`,
        nodeId: deadEndNodes[0]?.id
      });
    }

    // Check for forward nodes
    const forwardNodes = nodes.filter(n => n.type === 'forward');
    if (forwardNodes.length === 0) {
      newDiagnostics.push({
        type: 'info',
        title: 'Sem bloco de transferência',
        description: 'O fluxo não transfere para atendentes humanos. Certifique-se de que é intencional.'
      });
    } else {
      // Check if forward nodes have department or agent configured
      const unconfiguredForwards = forwardNodes.filter(n => 
        !n.data?.departmentId && !n.data?.specificAgentId
      );
      if (unconfiguredForwards.length > 0) {
        newDiagnostics.push({
          type: 'error',
          title: 'Transferência não configurada',
          description: `${unconfiguredForwards.length} bloco(s) de transferência sem departamento ou atendente definido.`,
          nodeId: unconfiguredForwards[0]?.id
        });
      } else {
        forwardNodes.forEach(n => {
          if (n.data?.departmentId) {
            newDiagnostics.push({
              type: 'success',
              title: `Transferência para fila: ${n.data?.departmentName || 'Departamento'}`,
              description: 'Clientes serão encaminhados para a fila deste departamento.',
              nodeId: n.id
            });
          }
          if (n.data?.specificAgentId) {
            newDiagnostics.push({
              type: 'success',
              title: `Transferência direta: ${n.data?.specificAgentName || 'Atendente'}`,
              description: 'Clientes serão encaminhados diretamente para o chat deste atendente.',
              nodeId: n.id
            });
          }
        });
      }
    }

    // Check for message nodes with buttons but no error handling
    const menuNodes = nodes.filter(n => 
      n.type === 'message' && 
      (n.data?.messageType === 'buttons' || n.data?.messageType === 'list') &&
      !n.data?.errorMessage
    );
    if (menuNodes.length > 0) {
      newDiagnostics.push({
        type: 'warning',
        title: 'Menus sem tratamento de erro',
        description: `${menuNodes.length} menu(s) sem mensagem de erro configurada. Usuários podem ficar presos se digitarem opção inválida.`,
        nodeId: menuNodes[0]?.id
      });
    }

    // Count total nodes
    newDiagnostics.push({
      type: 'info',
      title: `${nodes.length} blocos no fluxo`,
      description: `${edges.length} conexões entre blocos.`
    });

    setDiagnostics(newDiagnostics);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollLogsToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollLogsToBottom();
  }, [logs]);

  const resetChat = () => {
    setMessages([]);
    setLogs([]);
    setContext({});
    setMessage('');
    setWaitingForInput(false);
    setCurrentNodeId(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const addLog = (type: string, message: string, status: 'info' | 'success' | 'error' | 'running' = 'info') => {
    const log: ExecutionLog = {
      nodeId: '',
      nodeType: type,
      message,
      status,
      timestamp: new Date()
    };
    setLogs(prev => [...prev, log]);
  };

  const handleTest = async () => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = message.trim();
    setMessage('');
    setIsRunning(true);

    addLog('system', '▶ Executando fluxo...', 'running');

    const flowContext = {
      message: userInput,
      contact: {
        phone: '5511999999999',
        name: 'Cliente Teste',
      },
      vars: context,
    };

    try {
      const result = await executeFlow(nodes, edges, flowContext, (log) => {
        setLogs((prev) => [...prev, log]);

        // Show bot messages in chat (format: MSG:content)
        if (log.message.startsWith('MSG:')) {
          const content = log.message.substring(4);
          const hasLink = content.includes('https://');
          const botMessage: ChatMessage = {
            id: `bot-${Date.now()}-${Math.random()}`,
            type: 'bot',
            content: content,
            timestamp: new Date(),
            isLink: hasLink
          };
          setMessages((prev) => [...prev, botMessage]);
        }

        // Show transfer to queue
        if (log.nodeType === 'forward' && log.message.includes('Fila')) {
          const systemMessage: ChatMessage = {
            id: `sys-${Date.now()}`,
            type: 'system',
            content: `🎯 ${log.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, systemMessage]);
        }

        // Show transfer to agent
        if (log.nodeType === 'forward' && log.message.includes('atendente')) {
          const systemMessage: ChatMessage = {
            id: `sys-${Date.now()}`,
            type: 'system',
            content: `👤 ${log.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, systemMessage]);
        }

        // Show form collection
        if (log.nodeType === 'form' && log.status === 'running' && !log.message.startsWith('MSG:')) {
          const systemMessage: ChatMessage = {
            id: `sys-${Date.now()}`,
            type: 'system',
            content: log.message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, systemMessage]);
        }

        // Show waiting status
        if (log.status === 'waiting') {
          const systemMessage: ChatMessage = {
            id: `sys-${Date.now()}`,
            type: 'system',
            content: `⏳ ${log.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, systemMessage]);
        }
      });

      setContext(result.vars);

      if (result.waiting && result.waitingNodeId) {
        setWaitingForInput(true);
        setCurrentNodeId(result.waitingNodeId);
        addLog('system', '⏳ Aguardando resposta do usuário...', 'info');
      } else {
        setWaitingForInput(false);
        setCurrentNodeId(null);
        addLog('system', '✅ Fluxo finalizado com sucesso', 'success');

        const completionMessage: ChatMessage = {
          id: `complete-${Date.now()}`,
          type: 'system',
          content: `✅ Fluxo finalizado`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, completionMessage]);
      }

    } catch (error: any) {
      addLog('error', `❌ Erro: ${error.message}`, 'error');
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: `❌ Erro: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsRunning(false);
  };

  const getLogColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'running':
        return 'text-blue-400';
      case 'info':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  const getDiagnosticIcon = (type: FlowDiagnostic['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getDiagnosticBg = (type: FlowDiagnostic['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const renderMessageContent = (content: string, isLink?: boolean) => {
    if (!isLink) {
      return <p className="text-gray-900 text-sm whitespace-pre-wrap">{content}</p>;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return (
      <p className="text-gray-900 text-sm whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <a 
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#128c7e] underline hover:text-[#075e54] inline-flex items-center gap-1"
              >
                {part}
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };

  const errorCount = diagnostics.filter(d => d.type === 'error').length;
  const warningCount = diagnostics.filter(d => d.type === 'warning').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-[#075e54] text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <DialogTitle className="text-white">Testar Fluxo</DialogTitle>
              {errorCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {errorCount} erro(s)
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="ml-1 bg-yellow-500 hover:bg-yellow-600">
                  {warningCount} aviso(s)
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetChat}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reiniciar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Diagnostics & Logs */}
          <div className="w-[400px] bg-gray-900 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-3 mt-3 bg-gray-800">
                <TabsTrigger value="diagnostic" className="data-[state=active]:bg-gray-700">
                  Diagnóstico
                </TabsTrigger>
                <TabsTrigger value="console" className="data-[state=active]:bg-gray-700">
                  Console
                </TabsTrigger>
                <TabsTrigger value="vars" className="data-[state=active]:bg-gray-700">
                  Variáveis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="diagnostic" className="flex-1 mt-0 p-3 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {diagnostics.map((diag, index) => (
                      <Card 
                        key={index} 
                        className={cn(
                          "p-3 border",
                          getDiagnosticBg(diag.type)
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {getDiagnosticIcon(diag.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{diag.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{diag.description}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="console" className="flex-1 mt-0 overflow-hidden">
                <div className="p-3 border-b border-gray-700 flex items-center gap-2 shrink-0">
                  <Terminal className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-mono text-sm">Console de Debug</span>
                  <Badge variant="secondary" className="ml-auto text-xs bg-gray-700">
                    {logs.length} logs
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-3 h-[calc(100%-48px)]">
                  <div className="font-mono text-xs space-y-1">
                    {logs.length === 0 ? (
                      <p className="text-gray-500">Aguardando execução...</p>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className={cn("py-0.5", getLogColor(log.status))}>
                          <span className="text-gray-600">[{formatTime(log.timestamp)}]</span>{' '}
                          {log.nodeType !== 'system' && log.nodeType !== 'error' && (
                            <span className="text-yellow-400">[{log.nodeType}]</span>
                          )}{' '}
                          <span>{log.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="vars" className="flex-1 mt-0 p-3 overflow-hidden">
                <ScrollArea className="h-full">
                  {Object.keys(context).length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhuma variável coletada ainda.</p>
                  ) : (
                    <div className="text-xs font-mono space-y-2">
                      {Object.entries(context).map(([key, value]) => (
                        <Card key={key} className="p-2 bg-gray-800 border-gray-700">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-purple-400 font-semibold">{key}</span>
                            <span className="text-green-300 text-right break-all">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* WhatsApp Chat Area - Right Side */}
          <div className="flex-1 flex flex-col">
            {/* WhatsApp Header */}
            <div className="bg-[#128c7e] p-3 flex items-center gap-3 shrink-0">
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarImage src="" />
                <AvatarFallback className="bg-[#25d366] text-white font-bold">
                  E
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-white">Sua Empresa</p>
                <p className="text-xs text-white/70">
                  {isRunning ? 'digitando...' : 'online'}
                </p>
              </div>
              {Object.keys(context).length > 0 && (
                <Badge className="bg-white/20 text-white text-xs hover:bg-white/30">
                  {Object.keys(context).length} variável(s)
                </Badge>
              )}
            </div>

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-hidden"
              style={{
                backgroundColor: '#e5ddd5',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              <ScrollArea className="h-full p-4">
                <div className="space-y-2 max-w-xl mx-auto">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className="bg-white/90 rounded-lg p-6 inline-block shadow-lg">
                        <Play className="h-12 w-12 mx-auto text-[#128c7e] mb-3" />
                        <p className="text-gray-700 font-medium">Envie uma mensagem para iniciar</p>
                        <p className="text-gray-400 text-sm mt-1">O fluxo será executado e as mensagens aparecerão aqui</p>
                        {errorCount > 0 && (
                          <p className="text-red-500 text-sm mt-3 flex items-center justify-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Verifique os erros na aba Diagnóstico
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.type === 'user' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'
                      )}
                    >
                      {msg.type === 'system' ? (
                        <div className={cn(
                          "px-4 py-2 rounded-lg text-sm shadow-sm max-w-md",
                          msg.content.includes('✅') ? 'bg-green-100 text-green-800' :
                          msg.content.includes('❌') ? 'bg-red-100 text-red-800' :
                          msg.content.includes('🎯') ? 'bg-blue-100 text-blue-800' :
                          msg.content.includes('👤') ? 'bg-purple-100 text-purple-800' :
                          'bg-[#fcf4cb] text-gray-700'
                        )}>
                          {msg.content}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'max-w-[75%] rounded-lg p-3 shadow relative',
                            msg.type === 'user'
                              ? 'bg-[#dcf8c6] rounded-tr-none'
                              : 'bg-white rounded-tl-none'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {msg.type === 'bot' && (
                              <Bot className="h-4 w-4 text-[#128c7e] shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              {renderMessageContent(msg.content, msg.isLink)}
                              <p className="text-[10px] text-gray-500 text-right mt-1">
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                            {msg.type === 'user' && (
                              <User className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f0f0] p-3 border-t shrink-0">
              <div className="flex gap-2 max-w-xl mx-auto">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-white border-0 rounded-full px-4 shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleTest()}
                  disabled={isRunning}
                />
                <Button
                  onClick={handleTest}
                  disabled={isRunning || !message.trim()}
                  className="rounded-full h-10 w-10 p-0 bg-[#128c7e] hover:bg-[#075e54]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
