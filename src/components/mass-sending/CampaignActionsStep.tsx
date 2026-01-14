import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Send, Bell, AlertTriangle, Settings, UserPlus, Copy, Link, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface CampaignActionsStepProps {
  tags: TagItem[];
  tagOnSend: boolean;
  setTagOnSend: (v: boolean) => void;
  tagOnSendId: string;
  setTagOnSendId: (v: string) => void;
  notifyOnComplete: boolean;
  setNotifyOnComplete: (v: boolean) => void;
  saveAsLead: boolean;
  setSaveAsLead: (v: boolean) => void;
  // Sending config
  delayInterval: number;
  setDelayInterval: (v: number) => void;
  pauseEveryX: number;
  setPauseEveryX: (v: number) => void;
  pauseDuration: number;
  setPauseDuration: (v: number) => void;
  sendImmediately: boolean;
  setSendImmediately: (v: boolean) => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
}

export function CampaignActionsStep({
  tags,
  tagOnSend,
  setTagOnSend,
  tagOnSendId,
  setTagOnSendId,
  notifyOnComplete,
  setNotifyOnComplete,
  saveAsLead,
  setSaveAsLead,
  delayInterval,
  setDelayInterval,
  pauseEveryX,
  setPauseEveryX,
  pauseDuration,
  setPauseDuration,
  sendImmediately,
  setSendImmediately,
  acceptedTerms,
  setAcceptedTerms,
}: CampaignActionsStepProps) {
  return (
    <div className="space-y-5">
      {/* Sending Configuration */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Configurações de Envio</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure os intervalos para reduzir risco de banimento
        </p>

        <Card className="p-4 space-y-5">
          {/* Send Mode Toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Modo de envio</Label>
            <RadioGroup
              value={sendImmediately ? "immediate" : "queued"}
              onValueChange={(v) => setSendImmediately(v === "immediate")}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="immediate"
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  sendImmediately 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="immediate" id="immediate" className="sr-only" />
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Enviar Agora</p>
                  <p className="text-xs text-muted-foreground">Envia imediatamente</p>
                </div>
              </Label>
              <Label
                htmlFor="queued"
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  !sendImmediately 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="queued" id="queued" className="sr-only" />
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Enfileirar</p>
                  <p className="text-xs text-muted-foreground">Agenda para 1 min</p>
                </div>
              </Label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {sendImmediately 
                ? "As mensagens serão enviadas imediatamente, uma após a outra com o intervalo configurado."
                : "As mensagens serão enfileiradas e enviadas pelo servidor em 1 minuto."}
            </p>
          </div>

          {/* Delay Interval */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Intervalo entre mensagens</Label>
              <span className="text-sm font-medium text-primary">{delayInterval}s</span>
            </div>
            <Slider
              value={[delayInterval]}
              onValueChange={(v) => setDelayInterval(v[0])}
              min={5}
              max={120}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Tempo mínimo entre cada mensagem enviada (recomendado: 10-30s)
            </p>
          </div>

          {/* Pause every X */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pausar a cada X mensagens</Label>
              <span className="text-sm font-medium text-primary">{pauseEveryX} msgs</span>
            </div>
            <Slider
              value={[pauseEveryX]}
              onValueChange={(v) => setPauseEveryX(v[0])}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              A cada X mensagens, faz uma pausa maior para simular comportamento humano
            </p>
          </div>

          {/* Pause Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Duração da pausa</Label>
              <span className="text-sm font-medium text-primary">{pauseDuration}s</span>
            </div>
            <Slider
              value={[pauseDuration]}
              onValueChange={(v) => setPauseDuration(v[0])}
              min={30}
              max={300}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Duração da pausa a cada X envios (recomendado: 60-120s)
            </p>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div>
        <h3 className="font-semibold mb-1">Ações Automáticas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure ações que serão executadas automaticamente
        </p>
      </div>

      {/* Tag on Send */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Etiquetar ao Enviar</p>
                <p className="text-sm text-muted-foreground">
                  Adiciona uma etiqueta ao contato quando a mensagem for enviada
                </p>
              </div>
              <Switch checked={tagOnSend} onCheckedChange={setTagOnSend} />
            </div>
            {tagOnSend && (
              <Select value={tagOnSendId} onValueChange={setTagOnSendId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || "#3B82F6" }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </Card>

      {/* Save as Lead */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Salvar como Contato</p>
                <p className="text-sm text-muted-foreground">
                  Adiciona os números à sua lista de contatos automaticamente
                </p>
              </div>
              <Switch checked={saveAsLead} onCheckedChange={setSaveAsLead} />
            </div>
          </div>
        </div>
      </Card>

      {/* Notify on Complete */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificar ao Concluir</p>
                <p className="text-sm text-muted-foreground">
                  Receba uma notificação quando a campanha terminar
                </p>
              </div>
              <Switch checked={notifyOnComplete} onCheckedChange={setNotifyOnComplete} />
            </div>
          </div>
        </div>
      </Card>

      {/* Terms of Use */}
      <Card className="p-4 border-orange-500/30 bg-orange-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">Termo de uso</p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                A prática de envios em massa ou spam podem ocasionar o banimento do seu número por parte do WhatsApp. 
                Envie mensagens apenas para pessoas que gostariam de receber sua mensagem.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={acceptedTerms} 
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Eu entendo e aceito os termos de uso.
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Summary of enabled actions */}
      {(tagOnSend || saveAsLead || notifyOnComplete) && (
        <Card className="p-4 bg-muted/50 border-dashed">
          <p className="text-sm font-medium mb-2">Ações configuradas:</p>
          <div className="flex flex-wrap gap-2">
            {tagOnSend && tagOnSendId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Send className="w-3 h-3" />
                Etiquetar ao enviar: {tags.find(t => t.id === tagOnSendId)?.name}
              </Badge>
            )}
            {saveAsLead && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                Salvar como contato
              </Badge>
            )}
            {notifyOnComplete && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Notificar ao concluir
              </Badge>
            )}
          </div>
        </Card>
      )}

      {tags.length === 0 && tagOnSend && (
        <Card className="p-4 border-orange-500/30 bg-orange-500/5">
          <div className="flex items-center gap-2 text-orange-600">
            <Tag className="w-4 h-4" />
            <p className="text-sm">
              Você ainda não tem etiquetas cadastradas. Crie etiquetas na página de Contatos.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
