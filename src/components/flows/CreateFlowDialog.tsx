import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFlow: (flow: {
    name: string;
    trigger: string;
    status: string;
    flow_data: any;
  }) => void;
  template?: string;
}

export const CreateFlowDialog = ({ open, onOpenChange, onCreateFlow, template }: CreateFlowDialogProps) => {
  const [name, setName] = useState(template || "");
  const [trigger, setTrigger] = useState("Primeira mensagem");
  const [message, setMessage] = useState("");

  const handleCreate = () => {
    onCreateFlow({
      name,
      trigger,
      status: "active",
      flow_data: {
        message,
        template: template || "custom"
      }
    });
    onOpenChange(false);
    setName("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Fluxo</DialogTitle>
          <DialogDescription>
            Configure o nome, gatilho e mensagem automática para o seu novo fluxo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nome do Fluxo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boas-vindas automático"
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="trigger">Gatilho</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Primeira mensagem">Primeira mensagem</SelectItem>
                <SelectItem value="Palavra-chave: 'orçamento'">Palavra-chave: 'orçamento'</SelectItem>
                <SelectItem value="Palavra-chave: 'ajuda'">Palavra-chave: 'ajuda'</SelectItem>
                <SelectItem value="Palavra-chave: 'preço'">Palavra-chave: 'preço'</SelectItem>
                <SelectItem value="Horário comercial">Horário comercial</SelectItem>
                <SelectItem value="Fora do horário">Fora do horário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Mensagem Automática</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem que será enviada automaticamente..."
              className="mt-2 min-h-[120px]"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name || !message}
          >
            Criar Fluxo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
