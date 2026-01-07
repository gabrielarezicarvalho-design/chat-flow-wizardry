import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, X, Download, Trash2, GripHorizontal, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  timestamp: string;
  type: "info" | "error" | "success" | "warning" | "command";
  message: string;
}

export const DebugConsole = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keyboard shortcut: Shift + 8 (which is *)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === '*') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        if (!isVisible) {
          addLog('info', '🔧 Console aberto via Shift+8');
        }
      }
      // Also support Ctrl+Shift+D
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        if (!isVisible) {
          addLog('info', '🔧 Console aberto via Ctrl+Shift+D');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Listen for real-time messages
    const channel = supabase
      .channel('debug_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload: any) => {
          addLog('success', `✅ Nova mensagem: ID ${payload.new.id} | De: ${payload.new.remetente} | "${payload.new.conteudo?.substring(0, 50)}..."`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          addLog('success', `✅ Nova conversa: ID ${payload.new.id} | Lead: ${payload.new.lead_id}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          addLog('success', `✅ Novo lead: ${payload.new.name} | Tel: ${payload.new.phone}`);
        }
      )
      .subscribe();

    // Listen for console errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      addLog('error', `❌ ERRO: ${message}`);
      originalError.apply(console, args);
    };

    // Initial log
    addLog('info', '🔧 Console iniciado - Pressione Shift+8 ou Ctrl+Shift+D para abrir');
    addLog('info', '💡 Digite "help" para ver comandos disponíveis');

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      supabase.removeChannel(channel);
      console.error = originalError;
    };
  }, [isVisible]);

  // Drag handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { timestamp, type, message }].slice(-200));
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (consoleRef.current) {
      const rect = consoleRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleCommand = () => {
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;
    
    addLog('command', `> ${commandInput}`);
    
    switch (cmd) {
      case 'help':
        addLog('info', '📋 Comandos disponíveis:');
        addLog('info', '  • help - Mostra esta mensagem');
        addLog('info', '  • clear - Limpa o console');
        addLog('info', '  • status - Verifica status do sistema');
        addLog('info', '  • connections - Lista conexões ativas');
        addLog('info', '  • messages - Últimas 5 mensagens');
        addLog('info', '  • flows - Lista fluxos ativos');
        addLog('info', '  • agents - Lista agentes e status');
        addLog('info', '  • departments - Lista departamentos');
        addLog('info', '  • export - Exporta logs para arquivo');
        break;
      
      case 'clear':
        setLogs([]);
        addLog('info', '🧹 Console limpo');
        break;
      
      case 'status':
        checkSystemStatus();
        break;
      
      case 'connections':
        checkConnections();
        break;
      
      case 'messages':
        checkRecentMessages();
        break;
      
      case 'flows':
        checkFlows();
        break;
        
      case 'agents':
        checkAgents();
        break;
        
      case 'departments':
        checkDepartments();
        break;
      
      case 'export':
        exportLogs();
        break;
      
      default:
        addLog('error', `❌ Comando desconhecido: "${cmd}". Digite "help" para ver comandos`);
    }
    
    setCommandInput("");
  };

  const checkSystemStatus = async () => {
    addLog('info', '🔍 Verificando status do sistema...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      addLog('success', `✅ Autenticação: ${user ? 'Conectado como ' + user.email : 'Desconectado'}`);
      
      if (user) {
        const { count: convsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: msgsCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });
        
        const { count: flowsCount } = await supabase
          .from('flows')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        addLog('info', `📊 Conversas: ${convsCount || 0}`);
        addLog('info', `💬 Mensagens totais: ${msgsCount || 0}`);
        addLog('info', `🔄 Fluxos: ${flowsCount || 0}`);
      }
    } catch (error: any) {
      addLog('error', `❌ Erro ao verificar status: ${error.message}`);
    }
  };

  const checkConnections = async () => {
    addLog('info', '🔍 Verificando conexões...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addLog('error', '❌ Usuário não autenticado');
        return;
      }
      
      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id);
      
      if (!connections || connections.length === 0) {
        addLog('warning', '⚠️ Nenhuma conexão encontrada');
      } else {
        connections.forEach(conn => {
          addLog('success', `✅ ${conn.name} | Status: ${conn.status} | Env: ${conn.environment} | ID: ${conn.instance_id}`);
        });
      }
    } catch (error: any) {
      addLog('error', `❌ Erro ao verificar conexões: ${error.message}`);
    }
  };

  const checkRecentMessages = async () => {
    addLog('info', '🔍 Buscando últimas mensagens...');
    
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(5);
      
      if (!messages || messages.length === 0) {
        addLog('warning', '⚠️ Nenhuma mensagem encontrada');
      } else {
        messages.forEach((msg: any) => {
          addLog('info', `💬 ${msg.remetente}: "${msg.conteudo?.substring(0, 40)}..." | ${new Date(msg.criado_em).toLocaleString()}`);
        });
      }
    } catch (error: any) {
      addLog('error', `❌ Erro ao buscar mensagens: ${error.message}`);
    }
  };

  const checkFlows = async () => {
    addLog('info', '🔍 Buscando fluxos...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addLog('error', '❌ Usuário não autenticado');
        return;
      }
      
      const { data: flows } = await supabase
        .from('flows')
        .select('*')
        .eq('user_id', user.id);
      
      if (!flows || flows.length === 0) {
        addLog('warning', '⚠️ Nenhum fluxo encontrado');
      } else {
        flows.forEach((flow: any) => {
          addLog('info', `🔄 ${flow.name} | Status: ${flow.status} | Trigger: ${flow.trigger}`);
        });
      }
    } catch (error: any) {
      addLog('error', `❌ Erro ao buscar fluxos: ${error.message}`);
    }
  };

  const checkAgents = async () => {
    addLog('info', '🔍 Buscando agentes...');
    
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      
      if (!roles || roles.length === 0) {
        addLog('warning', '⚠️ Nenhum agente encontrado');
        return;
      }
      
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profiles) {
        profiles.forEach((p: any) => {
          addLog('info', `👤 ${p.full_name || p.username} | ${p.is_online ? '🟢 Online' : '⚫ Offline'} | Status: ${p.status || 'N/A'}`);
        });
      }
    } catch (error: any) {
      addLog('error', `❌ Erro ao buscar agentes: ${error.message}`);
    }
  };

  const checkDepartments = async () => {
    addLog('info', '🔍 Buscando departamentos...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addLog('error', '❌ Usuário não autenticado');
        return;
      }
      
      const { data: departments } = await supabase
        .from('departments')
        .select('*, department_members(count)')
        .eq('user_id', user.id);
      
      if (!departments || departments.length === 0) {
        addLog('warning', '⚠️ Nenhum departamento encontrado');
      } else {
        departments.forEach((d: any) => {
          const memberCount = d.department_members?.[0]?.count || 0;
          addLog('info', `🏢 ${d.name} | Membros: ${memberCount} | Cor: ${d.color || 'N/A'}`);
        });
      }
    } catch (error: any) {
      addLog('error', `❌ Erro ao buscar departamentos: ${error.message}`);
    }
  };

  const exportLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('success', '✅ Logs exportados com sucesso');
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', '🧹 Logs limpos');
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Card 
      ref={consoleRef}
      className={`fixed z-[99999] flex flex-col bg-[#1a1a2e] border-2 border-[#0066ff]/60 shadow-2xl shadow-[#0066ff]/20 ${isMinimized ? 'w-[400px] h-[50px]' : 'w-[800px] h-[500px]'}`}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Draggable Header */}
      <div 
        className="p-2 border-b border-[#0066ff]/50 flex items-center justify-between bg-gradient-to-r from-[#0066ff]/20 to-[#00d4ff]/10 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-[#00d4ff]" />
          <Terminal className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-xs font-mono text-[#00d4ff] font-bold">MARKETFLOW DEBUG CONSOLE</span>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Shift+8</span>
        </div>
        <div className="flex gap-1">
          {!isMinimized && (
            <>
              <Button
                onClick={() => setFilter('all')}
                size="sm"
                variant="ghost"
                className={`h-6 px-2 text-xs ${filter === 'all' ? 'text-[#00d4ff] bg-[#00d4ff]/20' : 'text-gray-500'} hover:bg-[#00d4ff]/20`}
              >
                All
              </Button>
              <Button
                onClick={() => setFilter('error')}
                size="sm"
                variant="ghost"
                className={`h-6 px-2 text-xs ${filter === 'error' ? 'text-red-500 bg-red-500/20' : 'text-gray-500'} hover:bg-red-500/20`}
              >
                Errors
              </Button>
              <Button
                onClick={() => setFilter('success')}
                size="sm"
                variant="ghost"
                className={`h-6 px-2 text-xs ${filter === 'success' ? 'text-green-500 bg-green-500/20' : 'text-gray-500'} hover:bg-green-500/20`}
              >
                Success
              </Button>
              <Button
                onClick={exportLogs}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-[#00d4ff] hover:bg-[#00d4ff]/20"
                title="Exportar logs"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                onClick={clearLogs}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-[#00d4ff] hover:bg-[#00d4ff]/20"
                title="Limpar logs"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-[#00d4ff] hover:bg-[#00d4ff]/20"
            title={isMinimized ? 'Maximizar' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          <Button
            onClick={() => setIsVisible(false)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/20"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-3 bg-[#0d0d1a]" ref={scrollRef}>
            <div className="space-y-1 font-mono text-xs">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    log.type === 'command' ? 'text-cyan-400 font-bold' :
                    'text-gray-400'
                  }`}
                >
                  <span className="text-gray-600">[{log.timestamp}]</span>{' '}
                  <span>{log.message}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-gray-600 text-center py-8">
                  {filter === 'all' 
                    ? 'Nenhum log ainda... Digite "help" para ver comandos'
                    : `Nenhum log do tipo "${filter}"`
                  }
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-2 border-t border-[#0066ff]/50 bg-[#0d0d1a]">
            <div className="flex gap-2 items-center">
              <span className="text-[#00d4ff] font-mono text-sm font-bold">{'$>'}</span>
              <Input
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCommand();
                  }
                }}
                placeholder="Digite um comando (ex: help, status, clear, flows, agents)..."
                className="flex-1 bg-[#1a1a2e] border-[#0066ff]/30 text-[#00d4ff] font-mono text-xs focus-visible:ring-[#00d4ff]/50 placeholder:text-gray-600"
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
