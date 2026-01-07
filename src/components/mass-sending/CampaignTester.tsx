import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Play, Loader2, Trash2, FlaskConical, Clock, Users, Zap, Send, Plus, X, 
  Pause, CheckCircle, AlertCircle, Timer, Settings, Calendar, Terminal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Connection {
  id: string;
  name: string;
  status: string;
}

interface CampaignTesterProps {
  connections: Connection[];
}

interface TestResult {
  success: boolean;
  timestamp: string;
  response: any;
  duration: number;
  contactsCount: number;
  type?: 'immediate' | 'scheduled';
}

interface CampaignProgress {
  id: string;
  campaign_name: string;
  total_messages: number;
  sent_count: number;
  failed_count: number;
  current_status: string;
  current_message_index: number;
  delay_min: number;
  delay_max: number;
  pause_every_x: number;
  pause_duration: number;
  pause_until: string | null;
  started_at: string | null;
  created_at: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export function CampaignTester({ connections }: CampaignTesterProps) {
  const [selectedConnection, setSelectedConnection] = useState("");
  const [testNumbers, setTestNumbers] = useState<string[]>(["5511999999999"]);
  const [message, setMessage] = useState("Teste de campanha com delay");
  const [campaignName, setCampaignName] = useState("Teste de Delay");
  const [scheduleMinutes, setScheduleMinutes] = useState(1);
  const [scheduleDatetime, setScheduleDatetime] = useState("");
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduleType, setScheduleType] = useState<'minutes' | 'datetime'>('minutes');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  
  // Delay settings
  const [delayInterval, setDelayInterval] = useState(20);
  const [pauseEveryX, setPauseEveryX] = useState(10);
  const [pauseDuration, setPauseDuration] = useState(60);
  
  // Live progress
  const [activeProgress, setActiveProgress] = useState<CampaignProgress | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  
  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type,
      message,
      data
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
    console.log(`[CampaignTester] [${type.toUpperCase()}] ${message}`, data || '');
  };

  // Listen for realtime updates on campaign_progress
  useEffect(() => {
    const channel = supabase
      .channel('campaign-progress-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_progress'
        },
        (payload) => {
          addLog('info', 'Atualização realtime recebida', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newProgress = payload.new as CampaignProgress;
            setActiveProgress(newProgress);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Countdown timer for delays
  useEffect(() => {
    if (activeProgress?.current_status === 'paused' && activeProgress.pause_until) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, new Date(activeProgress.pause_until!).getTime() - Date.now());
        setCountdown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeProgress?.current_status, activeProgress?.pause_until]);

  const addNumber = () => {
    setTestNumbers([...testNumbers, ""]);
  };

  const removeNumber = (index: number) => {
    setTestNumbers(testNumbers.filter((_, i) => i !== index));
  };

  const updateNumber = (index: number, value: string) => {
    const updated = [...testNumbers];
    updated[index] = value;
    setTestNumbers(updated);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runCampaignTest = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão");
      addLog('error', 'Nenhuma conexão selecionada');
      return;
    }
    
    const validNumbers = testNumbers.filter(n => n.trim().length >= 10);
    if (validNumbers.length === 0) {
      toast.error("Adicione pelo menos um número válido");
      addLog('error', 'Nenhum número válido fornecido');
      return;
    }

    setTesting(true);
    const startTime = Date.now();

    try {
      const formattedNumbers = validNumbers.map(n => 
        n.replace(/\D/g, "") + "@s.whatsapp.net"
      );

      addLog('info', `Iniciando campanha: ${campaignName}`, {
        connection: selectedConnection,
        numbers: formattedNumbers.length,
        useSchedule,
        scheduleType: useSchedule ? scheduleType : 'immediate'
      });

      let payload: any = {
        connectionId: selectedConnection,
        numbers: formattedNumbers,
        type: "text",
        text: message,
        delayInterval: delayInterval,
        pauseEveryX: pauseEveryX,
        pauseDuration: pauseDuration,
        info: campaignName
      };

      // Determine schedule
      if (useSchedule) {
        if (scheduleType === 'minutes' && scheduleMinutes > 0) {
          payload.scheduled_for = scheduleMinutes;
          payload.action = "simple"; // Use simple action for scheduled
          addLog('info', `Agendando para ${scheduleMinutes} minuto(s) no futuro`);
        } else if (scheduleType === 'datetime' && scheduleDatetime) {
          const targetDate = new Date(scheduleDatetime);
          const now = new Date();
          const diffMinutes = Math.ceil((targetDate.getTime() - now.getTime()) / 60000);
          
          if (diffMinutes <= 0) {
            toast.error("A data/hora deve ser no futuro");
            addLog('error', 'Data/hora inválida - deve ser no futuro', { scheduleDatetime, diffMinutes });
            setTesting(false);
            return;
          }
          
          payload.scheduled_for = diffMinutes;
          payload.action = "simple"; // Use simple action for scheduled
          addLog('info', `Agendando para ${format(targetDate, 'dd/MM/yyyy HH:mm')} (${diffMinutes} minutos)`, {
            targetDate: targetDate.toISOString(),
            diffMinutes
          });
        }
      } else {
        payload.action = "campaign_with_progress"; // Use progress tracking for immediate
        addLog('info', 'Enviando imediatamente com progresso ao vivo');
      }

      addLog('info', 'Enviando payload para wa-sender', payload);

      const { data, error } = await supabase.functions.invoke("wa-sender", { body: payload });

      const duration = Date.now() - startTime;

      if (error) {
        addLog('error', 'Erro na resposta da Edge Function', { error: error.message, details: error });
        throw new Error(error.message);
      }

      addLog('info', 'Resposta recebida da Edge Function', data);

      const success = data?.success;

      if (success) {
        if (useSchedule) {
          toast.success(`Campanha agendada com sucesso!`);
          addLog('success', 'Campanha agendada com sucesso', data);
        } else {
          toast.success(`Campanha iniciada! Acompanhe o progresso ao vivo.`);
          addLog('success', 'Campanha iniciada com sucesso', data);
          
          // Load the progress immediately
          if (data?.progressId) {
            const { data: progress, error: progressError } = await supabase
              .from('campaign_progress')
              .select('*')
              .eq('id', data.progressId)
              .single();
            
            if (progressError) {
              addLog('error', 'Erro ao carregar progresso', progressError);
            } else if (progress) {
              setActiveProgress(progress as CampaignProgress);
              addLog('info', 'Progresso carregado', progress);
            }
          }
        }
      } else {
        toast.error(`Erro: ${data?.error || 'Erro desconhecido'}`);
        addLog('error', 'Campanha falhou', data);
      }

      setResults(prev => [{
        success,
        timestamp: new Date().toLocaleTimeString(),
        response: data,
        duration,
        contactsCount: validNumbers.length,
        type: useSchedule ? 'scheduled' as const : 'immediate' as const
      }, ...prev].slice(0, 10));
    } catch (err: any) {
      const duration = Date.now() - startTime;
      addLog('error', `Exceção capturada: ${err.message}`, { stack: err.stack });
      
      setResults(prev => [{
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        response: { error: err.message },
        duration,
        contactsCount: testNumbers.length,
        type: useSchedule ? 'scheduled' as const : 'immediate' as const
      }, ...prev].slice(0, 10));
      toast.error(`Erro: ${err.message}`);
    }

    setTesting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sending': return 'bg-blue-500';
      case 'paused': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'scheduled': return 'bg-purple-500';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      default: return <Timer className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sending': return 'Enviando';
      case 'paused': return 'Pausado';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'pending': return 'Aguardando';
      case 'scheduled': return 'Agendado';
      default: return status;
    }
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Configuration */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Teste de Campanha</h3>
          <Badge variant="outline" className="ml-auto">Com Progresso</Badge>
        </div>

        <div className="space-y-4">
          {/* Connection */}
          <div>
            <Label className="text-xs">Conexão</Label>
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione uma conexão" />
              </SelectTrigger>
              <SelectContent>
                {connections.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.status === "connected" ? "bg-green-500" : "bg-muted"}`} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Name */}
          <div>
            <Label className="text-xs">Nome da Campanha</Label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Nome para identificar"
              className="mt-1"
            />
          </div>

          {/* Test Numbers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                Números de Teste
              </Label>
              <Button size="sm" variant="ghost" onClick={addNumber}>
                <Plus className="w-3 h-3 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {testNumbers.map((num, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={num}
                    onChange={(e) => updateNumber(idx, e.target.value)}
                    placeholder="5511999999999"
                    className="font-mono text-sm"
                  />
                  {testNumbers.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removeNumber(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensagem de teste..."
              className="mt-1 h-20"
            />
          </div>

          {/* Delay Settings - New Design */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <div>
                <Label className="text-sm font-medium">Configurações de Envio</Label>
                <p className="text-xs text-muted-foreground">Configure os intervalos para reduzir risco de banimento</p>
              </div>
            </div>

            {/* Intervalo entre mensagens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Intervalo entre mensagens</Label>
                <span className="text-sm font-medium text-primary">{delayInterval}s</span>
              </div>
              <Slider
                value={[delayInterval]}
                onValueChange={(v) => setDelayInterval(v[0])}
                min={5}
                max={120}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo entre cada mensagem enviada (recomendado: 10-30s)
              </p>
            </div>

            {/* Pausar a cada X mensagens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Pausar a cada X mensagens</Label>
                <span className="text-sm font-medium text-primary">{pauseEveryX} msgs</span>
              </div>
              <Slider
                value={[pauseEveryX]}
                onValueChange={(v) => setPauseEveryX(v[0])}
                min={0}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                A cada X mensagens, faz uma pausa maior para simular comportamento humano
              </p>
            </div>

            {/* Duração da pausa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Duração da pausa</Label>
                <span className="text-sm font-medium text-primary">{pauseDuration}s</span>
              </div>
              <Slider
                value={[pauseDuration]}
                onValueChange={(v) => setPauseDuration(v[0])}
                min={30}
                max={300}
                step={10}
              />
              <p className="text-xs text-muted-foreground">
                Duração da pausa a cada X envios (recomendado: 60-120s)
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <Label className="text-sm">Agendar Envio</Label>
              </div>
              <Switch checked={useSchedule} onCheckedChange={setUseSchedule} />
            </div>
            
            {useSchedule && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={scheduleType === 'minutes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleType('minutes')}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Em X minutos
                  </Button>
                  <Button
                    type="button"
                    variant={scheduleType === 'datetime' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleType('datetime')}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Data/Hora
                  </Button>
                </div>
                
                {scheduleType === 'minutes' ? (
                  <div>
                    <Label className="text-xs text-muted-foreground">Enviar em (minutos)</Label>
                    <Input
                      type="number"
                      value={scheduleMinutes}
                      onChange={(e) => setScheduleMinutes(parseInt(e.target.value) || 1)}
                      placeholder="1"
                      min={1}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo: 1 minuto
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground">Data e Hora</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleDatetime}
                      onChange={(e) => setScheduleDatetime(e.target.value)}
                      className="mt-1"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Run Button */}
          <Button 
            onClick={runCampaignTest} 
            disabled={testing || !selectedConnection}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Iniciando campanha...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Campanha de Teste
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results + Live Progress */}
      <div className="space-y-4">
        {/* Live Progress Dashboard */}
        {activeProgress && activeProgress.current_status !== 'completed' && (
          <Card className="p-5 border-2 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(activeProgress.current_status)} animate-pulse`} />
              <h4 className="font-medium">Progresso ao Vivo</h4>
              <Badge variant="outline" className="ml-auto flex items-center gap-1">
                {getStatusIcon(activeProgress.current_status)}
                {getStatusText(activeProgress.current_status)}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Enviando mensagens</span>
                <span className="font-medium">
                  {activeProgress.sent_count + activeProgress.failed_count}/{activeProgress.total_messages}
                </span>
              </div>
              <Progress 
                value={((activeProgress.sent_count + activeProgress.failed_count) / activeProgress.total_messages) * 100} 
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-green-500/10 rounded-lg">
                <p className="text-lg font-bold text-green-600">{activeProgress.sent_count}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded-lg">
                <p className="text-lg font-bold text-red-600">{activeProgress.failed_count}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold">{activeProgress.total_messages - activeProgress.sent_count - activeProgress.failed_count}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>

            {/* Pause Countdown */}
            {activeProgress.current_status === 'paused' && countdown > 0 && (
              <div className="p-3 bg-orange-500/10 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 text-orange-600">
                  <Pause className="w-4 h-4" />
                  <span className="font-medium">Campanha pausada</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 mt-1">{countdown}s</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Retomando após pausa de {activeProgress.pause_duration}s (a cada {activeProgress.pause_every_x} mensagens)
                </p>
              </div>
            )}

            {/* Config Summary */}
            <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Intervalo: {activeProgress.delay_min}s</Badge>
              {activeProgress.pause_every_x > 0 && (
                <>
                  <Badge variant="secondary">Pausa a cada: {activeProgress.pause_every_x} msgs</Badge>
                  <Badge variant="secondary">Duração: {activeProgress.pause_duration}s</Badge>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Completed Progress */}
        {activeProgress && activeProgress.current_status === 'completed' && (
          <Card className="p-5 border-2 border-green-500/20">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium">Campanha Concluída</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => setActiveProgress(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{activeProgress.sent_count}</p>
                <p className="text-sm text-muted-foreground">Enviadas com sucesso</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{activeProgress.failed_count}</p>
                <p className="text-sm text-muted-foreground">Falharam</p>
              </div>
            </div>
          </Card>
        )}

        {/* Debug Logs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <h4 className="font-medium">Logs de Debug</h4>
              <Badge variant="outline">{logs.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowLogs(!showLogs)}>
                {showLogs ? 'Ocultar' : 'Mostrar'}
              </Button>
              {logs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearLogs}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {showLogs && (
            logs.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Logs aparecerão aqui</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[200px] bg-muted/30 rounded-lg p-2">
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                      <span className={`shrink-0 uppercase font-semibold ${getLogTypeColor(log.type)}`}>
                        [{log.type}]
                      </span>
                      <span className="text-foreground">{log.message}</span>
                      {log.data && (
                        <details className="inline">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            ver dados
                          </summary>
                          <pre className="mt-1 p-2 bg-background rounded text-[10px] overflow-x-auto max-w-full">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )
          )}
        </Card>

        {/* Results History */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Histórico de Resultados</h4>
            {results.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setResults([])}>
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Execute um teste para ver resultados</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <Card
                    key={idx}
                    className={`p-3 border-l-4 ${result.success ? "border-l-green-500" : "border-l-destructive"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                          {result.success ? "SUCESSO" : "ERRO"}
                        </Badge>
                        {result.type && (
                          <Badge variant="outline" className="text-xs">
                            {result.type === 'scheduled' ? 'Agendado' : 'Imediato'}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {result.contactsCount} contatos
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {result.duration}ms
                        </Badge>
                      </div>
                    </div>
                    <pre className="p-2 bg-muted rounded text-xs overflow-x-auto max-h-24">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
}
