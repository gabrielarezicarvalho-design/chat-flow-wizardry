import { useState } from "react";
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
import { toast } from "sonner";

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
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    setIsClosing(true);
    try {
      // TODO: Implement conversation closing logic when conversations table is created
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
            <Label htmlFor="contract">N° do Contrato</Label>
            <Input
              id="contract"
              placeholder="Digite o número do contrato (opcional)"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
            />
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
