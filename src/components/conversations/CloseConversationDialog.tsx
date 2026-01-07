import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SatisfactionSurvey {
  id: string;
  name: string;
  connection_id: string | null;
}

interface CloseConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  protocolNumber: string;
  onClose: () => void;
}

export const CloseConversationDialog = ({
  open,
  onOpenChange,
  conversationId,
  protocolNumber,
  onClose
}: CloseConversationDialogProps) => {
  const [contractNumber, setContractNumber] = useState("");
  const [observation, setObservation] = useState("");
  const [sendClosingMessage, setSendClosingMessage] = useState(true);
  const [sendSatisfactionSurvey, setSendSatisfactionSurvey] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [requireContract, setRequireContract] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);

  // Load connection settings and surveys
  useEffect(() => {
    const loadData = async () => {
      if (!conversationId || !open) return;
      
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Get conversation data
        const { data: conv } = await supabase
          .from('conversations')
          .select('connection_id, user_phone, leads(phone)')
          .eq('id', conversationId)
          .single();

        if (conv?.connection_id) {
          setConnectionId(conv.connection_id);
          setCustomerPhone(conv.user_phone || (conv.leads as any)?.phone || null);

          const { data: connection } = await supabase
            .from('connections')
            .select('credentials')
            .eq('id', conv.connection_id)
            .single();

          const creds = connection?.credentials as any;
          if (creds?.settings?.requireContractNumber === 'sim') {
            setRequireContract(true);
          } else {
            setRequireContract(false);
          }
        }

        // Load satisfaction surveys
        const { data: surveysData } = await supabase
          .from('satisfaction_surveys')
          .select('id, name, connection_id')
          .eq('user_id', userData.user.id)
          .eq('is_active', true);

        setSurveys(surveysData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [conversationId, open]);

  const handleClose = async () => {
    if (requireContract && !contractNumber.trim()) {
      toast.error('O número do contrato é obrigatório');
      return;
    }

    if (sendSatisfactionSurvey && !selectedSurveyId) {
      toast.error('Selecione uma pesquisa de satisfação');
      return;
    }

    setIsClosing(true);
    try {
      // Update conversation with closing info
      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          contract_number: contractNumber || null,
          closing_notes: observation || null
        })
        .eq('id', conversationId);

      if (error) throw error;

      const phone = customerPhone;

      if (sendClosingMessage && connectionId && phone) {
        const closingText = `Atendimento encerrado.\n\n📋 Protocolo: *${protocolNumber}*\n\nObrigado pelo contato!`;
        
        await supabase.functions.invoke('wa-send-text', {
          body: {
            connectionId,
            phone,
            text: closingText,
            conversationId
          }
        });
      }

      // Send satisfaction survey if enabled
      if (sendSatisfactionSurvey && selectedSurveyId && connectionId && phone) {
        const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
        
        // Get survey details
        const { data: surveyData } = await supabase
          .from('satisfaction_surveys')
          .select('*')
          .eq('id', selectedSurveyId)
          .single();

        if (surveyData) {
          const options = (surveyData.options as any[]) || [];
          const buttons = options.slice(0, 3).map((opt, idx) => ({
            buttonId: `satisfaction_${idx}_${opt.score}`,
            buttonText: { displayText: `${opt.emoji} ${opt.label}` },
            type: 1
          }));

          // Send interactive message with buttons
          await supabase.functions.invoke('wa-send-message', {
            body: {
              connectionId,
              phone,
              message: {
                text: surveyData.message_content,
                buttons
              },
              messageType: 'buttons'
            }
          });

          // Update total_sent counter
          await supabase
            .from('satisfaction_surveys')
            .update({ total_sent: (surveyData.total_sent || 0) + 1 })
            .eq('id', selectedSurveyId);

          toast.success('Pesquisa de satisfação enviada!');
        }
      }

      toast.success('Atendimento encerrado com sucesso');
      onClose();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao encerrar atendimento');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja encerrar esse atendimento?
          </p>

          <div className="space-y-2">
            <Label htmlFor="contract">
              N° do Contrato
              {requireContract && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id="contract"
              placeholder={requireContract ? "Digite o número do contrato" : "Digite o número do contrato (opcional)"}
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
            />
            {requireContract && (
              <p className="text-xs text-destructive">Campo obrigatório</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observation">Observação</Label>
            <Textarea
              id="observation"
              placeholder="Adicione uma observação (opcional)"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="sendClosing"
                checked={sendClosingMessage}
                onCheckedChange={setSendClosingMessage}
              />
              <Label htmlFor="sendClosing" className="text-sm font-normal cursor-pointer">
                Enviar mensagem de encerramento
              </Label>
            </div>
          </div>

          {/* Satisfaction Survey Option */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="sendSurvey"
                  checked={sendSatisfactionSurvey}
                  onCheckedChange={setSendSatisfactionSurvey}
                />
                <Label htmlFor="sendSurvey" className="text-sm font-normal cursor-pointer">
                  Enviar pesquisa de satisfação
                </Label>
              </div>
            </div>

            {sendSatisfactionSurvey && (
              <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pesquisa" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhuma pesquisa ativa
                    </div>
                  ) : (
                    surveys.map((survey) => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleClose}
            disabled={isClosing}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isClosing ? "Encerrando..." : "Encerrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};