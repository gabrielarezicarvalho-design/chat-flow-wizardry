import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    onCreateFlow({
      name,
      trigger: "first_message",
      status: "active",
      flow_data: {
        description,
        template: template || "custom"
      }
    });
    onOpenChange(false);
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Fluxo</DialogTitle>
          <DialogDescription>
            Configure o nome do seu fluxo. O gatilho será configurado dentro do editor de fluxo.
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
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste fluxo..."
              className="mt-2 min-h-[80px]"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name}
          >
            Criar Fluxo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
