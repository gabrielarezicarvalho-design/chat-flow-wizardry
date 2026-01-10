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
  Play, Loader2, FlaskConical, Users, Send, Plus, X, 
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
          payload.action = "simple";
          addLog('info', `Agendando para ${scheduleMinutes} minuto(s) no futuro`);
        } else if (scheduleType === 'datetime' && scheduleDatetime) {
          const targetDate = new Date(scheduleDatetime);
          const now = new Date();
          const diffMinutes = Math.ceil((targetDate.getTime() - now.getTime()) / 60000);
          
          if (diffMinutes <= 0) {
            toast.error("A data/hora deve ser no futuro");
            addLog('error', 'Data/hora inválida - deve ser no futuro');
            setTesting(false);
            return;
          }
          
          payload.scheduled_for = diffMinutes;
          payload.action = "simple";
          addLog('info', `Agendando para ${format(targetDate, 'dd/MM/yyyy HH:mm')}`);
        }
      } else {
        payload.action = "simple";
        addLog('info', 'Enviando imediatamente');
      }

      addLog('info', 'Enviando payload para wa-sender', payload);

      const { data, error } = await supabase.functions.invoke("wa-sender", { body: payload });

      const duration = Date.now() - startTime;

      if (error) {
        addLog('error', 'Erro na resposta da Edge Function', { error: error.message });
        throw new Error(error.message);
      }

      addLog('info', 'Resposta recebida da Edge Function', data);

      const success = data?.success;

      if (success) {
        if (useSchedule) {
          toast.success(`Campanha agendada com sucesso!`);
          addLog('success', 'Campanha agendada com sucesso', data);
        } else {
          toast.success(`Campanha enviada com sucesso!`);
          addLog('success', 'Campanha enviada com sucesso', data);
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
      addLog('error', `Exceção capturada: ${err.message}`);
      
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
          <Badge variant="outline" className="ml-auto">Simples</Badge>
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

          {/* Delay Settings */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <div>
                <Label className="text-sm font-medium">Configurações de Envio</Label>
                <p className="text-xs text-muted-foreground">Configure os intervalos</p>
              </div>
            </div>

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
            </div>

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
            </div>

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
            </div>
          </div>

          {/* Schedule */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <Label className="text-sm">Agendar envio</Label>
              </div>
              <Switch
                checked={useSchedule}
                onCheckedChange={setUseSchedule}
              />
            </div>

            {useSchedule && (
              <div className="space-y-3 pt-2">
                <Select value={scheduleType} onValueChange={(v: 'minutes' | 'datetime') => setScheduleType(v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Em X minutos</SelectItem>
                    <SelectItem value="datetime">Data/Hora específica</SelectItem>
                  </SelectContent>
                </Select>

                {scheduleType === 'minutes' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={scheduleMinutes}
                      onChange={(e) => setScheduleMinutes(Number(e.target.value))}
                      min={1}
                      max={1440}
                      className="w-20 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                ) : (
                  <Input
                    type="datetime-local"
                    value={scheduleDatetime}
                    onChange={(e) => setScheduleDatetime(e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            )}
          </div>

          <Button 
            className="w-full" 
            onClick={runCampaignTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {useSchedule ? 'Agendar Campanha' : 'Enviar Agora'}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Logs Panel */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Console de Logs</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clearLogs}>
              Limpar
            </Button>
            <Switch
              checked={showLogs}
              onCheckedChange={setShowLogs}
            />
          </div>
        </div>

        {showLogs && (
          <ScrollArea className="h-[400px] border rounded-lg p-3 bg-muted/20 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum log ainda. Execute um teste para ver os logs.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                    <span className={`font-semibold shrink-0 ${getLogTypeColor(log.type)}`}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Resultados Recentes</h4>
            <div className="space-y-2">
              {results.slice(0, 3).map((result, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                    result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{result.timestamp}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.type === 'scheduled' ? 'Agendado' : 'Imediato'}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">{result.duration}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}